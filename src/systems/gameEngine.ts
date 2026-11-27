import { createInitialState } from '../types/worldState.js';
import type { WorldState, Resource, Stats, Job, PendingRebirth } from '../types/worldState.js';
import { getBuildingType, getScaledCost, BUILDING_TYPES } from '../data/buildings.js';
import {
  BUILDING_JOB_MAP,
  getAvailableJobIds,
  JOB_STATS,
  JOBS,
  normalizeJobOrder,
} from '../data/jobs.js';
import { MARKET_RESOURCES } from '../data/market.js';
import type { MarketResource } from '../data/market.js';
import { DEFAULT_SPECIES_ID, NEUTRAL_STATS, SPECIES } from '../data/species.js';
import MarketSystem from './marketSystem.js';
import type { MarketAction, MarketFlow, MarketOrders } from './marketSystem.js';
import {
  GROWTH_INTERVAL_TICKS,
  getBirthChance,
  getPopulationCapacity,
} from './population.js';
import { getAverageStats, getJobFactor } from './stats.js';
import { getRebirthStatsPerSpecies, pickBirthSpecies } from './rebirth.js';
import { TICKS_PER_SECOND } from './ticks.js';
import { DEBUG } from '../utils/debug.js';
import { TECHNOLOGIES, getTechnology } from '../data/technologies.js';
import type { TechnologyType } from '../data/technologies.js';

export { TICKS_PER_SECOND };

/** Resource keys the engine tracks. */
const RESOURCE_KEYS = ['wood', 'stone', 'food', 'gold', 'research'] as const;

/**
 * The gold a rebirth costs.
 *
 * A rebirth throws the world away, so the gold is spent by doing it.
 */
export const REBIRTH_GOLD_COST = 1000;

/**
 * How many lives a village starts with.
 *
 * Every rebirth the pool is reset to this many humans; any elves earned
 * from previous villages are carried forward on top.
 */
export const REBIRTH_LIVES = 5;

class GameEngine {
  private state: WorldState;
  private intervalId: number | null = null;
  private tickRate: number = 1000 / TICKS_PER_SECOND;
  private tickMultiplier: number = 1;
  private marketSystem: MarketSystem;
  private listeners = new Set<() => void>();
  private buildingInstanceCounter: Record<string, number> = {};
  private loadEpoch = 0;
  private random: () => number;

  constructor(initialState?: WorldState, random: () => number = Math.random) {
    this.state = initialState ?? createInitialState();
    this.marketSystem = new MarketSystem(this.state);
    this.random = random;

    // The priority order holds every job exactly once, so a world that
    // arrived with a partial order is brought into line.
    this.state.jobOrder = normalizeJobOrder(this.state.jobOrder);

    // Recalculate job capacities from existing completed buildings
    this.recalculateJobCapacities();
  }

  // Recalculate job capacities from completed building counts
  private recalculateJobCapacities(): void {
    for (const [buildingTypeId, count] of Object.entries(this.state.buildingCounts)) {
      const jobId = BUILDING_JOB_MAP[buildingTypeId];
      if (jobId && this.state.jobs[jobId]) {
        this.state.jobs[jobId].capacity = count;
      }
    }

    // Rebuild instance counter from existing buildings
    for (const instanceKey of Object.keys(this.state.buildings)) {
      const parts = instanceKey.split('-');
      const buildingTypeId = parts.slice(0, -1).join('-');
      const lastPart = parts[parts.length - 1];
      if (!lastPart || !buildingTypeId) {continue;}
      const idx = parseInt(lastPart, 10);
      if (!Number.isNaN(idx)) {
        this.buildingInstanceCounter[buildingTypeId] = Math.max(
          this.buildingInstanceCounter[buildingTypeId] ?? 0,
          idx + 1,
        );
      }
    }
  }

  // Subscribe to state changes so the UI can mirror the engine reactively
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Get current game state
  getState(): WorldState {
    return { ...this.state };
  }

  /**
   * Replace the world with a loaded one.
   *
   * The market system holds a reference to the state object, so it is rebuilt
   * rather than reused. Job capacities and the building instance counter are
   * recalculated from the loaded state, because both are derived values that
   * a save does not carry.
   */
  loadState(state: WorldState): void {
    this.state = state;
    this.state.jobOrder = normalizeJobOrder(this.state.jobOrder);
    this.marketSystem = new MarketSystem(this.state);

    this.buildingInstanceCounter = {};
    this.recalculateJobCapacities();

    // A load replaces the world, so anything that captured the old one is
    // now stale.
    this.loadEpoch++;

    this.notify();
  }

  /**
   * A counter that changes whenever the world is replaced.
   *
   * A save reads the epoch before it starts writing and compares it
   * afterwards. A change in between means the world was replaced while the
   * save was in flight, so what it wrote belongs to a world that no longer
   * exists.
   */
  getLoadEpoch(): number {
    return this.loadEpoch;
  }

  /**
   * Throw the world away and start a new one.
   *
   * The saved game is left alone, so a player who resets by accident can
   * still load the old world back.
   */
  resetState(): void {
    this.loadState(createInitialState());
  }

  // Start the game loop
  start(): void {
    if (this.intervalId !== null) {return;}

    this.intervalId = window.setInterval(() => {
      this.runTicks(this.tickMultiplier);
    }, this.tickRate);
  }

  // Stop the game loop
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * How many ticks each interval fires.
   *
   * This does not change what the engine does per tick; it only changes how
   * many ticks run per second, so the UI can refresh at its own pace while
   * the simulation accelerates.
   */
  setTickMultiplier(multiplier: number): void {
    this.tickMultiplier = multiplier;
  }

  /** The current tick multiplier. */
  getTickMultiplier(): number {
    return this.tickMultiplier;
  }

  // Advance the world by one tick without notifying subscribers.
  private stepTick(): void {
    this.state.tick++;
    this.state.gameTime += this.tickRate / 1000; // Convert ms to seconds

    // Process resource generation
    this.processResourceGeneration();

    // Process market trades
    this.marketSystem.processTrades();

    // Clamp resources after market trades too.
    this.clampResources();

    // Process population growth
    this.processPopulationGrowth();
  }

  // Main game tick function
  private tick(): void {
    this.stepTick();
    this.notify();
  }

  /**
   * Advance the world by `ticks` ticks without notifying between them.
   *
   * The UI drives the engine one tick at a time through `start()`, which
   * notifies subscribers after every tick. Batching runs the same simulation
   * but pays the notification cost once, so a backlog of ticks (a backgrounded
   * tab, a slow frame) can be caught up in a single pass.
   */
  runTicks(ticks: number): void {
    if (!Number.isFinite(ticks) || ticks <= 0) {return;}

    const count = Math.floor(ticks);
    for (let i = 0; i < count; i++) {
      this.stepTick();
    }

    this.notify();
  }

  // Process resource generation from jobs
  private processResourceGeneration(): void {
    const jobs = this.state.jobs;

    // Production and consumption from each job
    for (const job of Object.values(jobs)) {
      if (job.workers <= 0) {continue;}

      // The stats of the people working the job decide how well they work.
      // A job with no stats of its own is neither helped nor hindered.
      const factor = this.getJobFactor(job);

      this.state.resources.wood += job.production.wood * job.workers * factor;
      this.state.resources.stone += job.production.stone * job.workers * factor;
      this.state.resources.food += job.production.food * job.workers * factor;
      this.state.resources.gold += job.production.gold * job.workers * factor;

      // Job consumption (currently zero; reserved for future tier-2 products).
      this.state.resources.wood -= job.consumption.wood * job.workers;
      this.state.resources.stone -= job.consumption.stone * job.workers;
      this.state.resources.food -= job.consumption.food * job.workers;
      this.state.resources.gold -= job.consumption.gold * job.workers;
    }

    // Species-based consumption and research from the whole population.
    for (const [speciesId, entry] of Object.entries(this.state.species)) {
      if (entry.count <= 0) {continue;}

      const speciesData = SPECIES.find((s) => s.id === speciesId);
      if (!speciesData) {continue;}

      // Every person of this species eats their base consumption per tick.
      this.state.resources.food -= speciesData.baseConsumption.food * entry.count;
      this.state.resources.wood -= speciesData.baseConsumption.wood * entry.count;
      this.state.resources.stone -= speciesData.baseConsumption.stone * entry.count;
      this.state.resources.gold -= speciesData.baseConsumption.gold * entry.count;

      // Every person of this species produces their base research per tick.
      this.state.resources.research += speciesData.baseResearch * entry.count;
    }

    // Clamp resources to their storage caps.
    this.clampResources();
  }

  /**
   * The stats of the creatures working a job, averaged over its workers.
   *
   * A job staffed by one elf and one human has the average of the two.
   */
  private getJobAverageStats(job: Job): Stats {
    return getAverageStats(job.species, (speciesId) =>
      this.state.species[speciesId]?.stats ?? NEUTRAL_STATS);
  }

  /**
   * The factor the people working a job give to its production.
   *
   * The primary stat counts fully and the secondary stat counts half, and
   * the two multiply. A stat of 100 is the average and changes nothing.
   */
  private getJobFactor(job: Job): number {
    const jobStats = JOB_STATS[job.id];

    if (!jobStats) {
      return 1;
    }

    return getJobFactor(jobStats, this.getJobAverageStats(job));
  }

  // Apply the effects of a building that has just been paid for
  private applyBuildingEffects(buildingId: string): void {
    console.info(`Building ${buildingId} built!`);

    // Each building adds +1 capacity to its associated job
    const jobId = BUILDING_JOB_MAP[buildingId];
    if (jobId && this.state.jobs[jobId]) {
      this.state.jobs[jobId].capacity += 1;
      this.balanceWorkers();
    }
  }

  /**
   * Roll for a birth.
   *
   * The world rolls once every growth interval. A birth needs somewhere to
   * live, so it only happens when the huts have room.
   */
  private processPopulationGrowth(): void {
    if (this.state.tick % GROWTH_INTERVAL_TICKS !== 0) {
      return;
    }

    if (this.getPopulation() >= this.getPopulationCapacity()) {
      return;
    }

    if (this.random() >= getBirthChance(this.getPopulation())) {
      return;
    }

    // A new person joins the default job, which is where the unassigned
    // people live. The child's species is picked by that species' share of
    // the current population: 1 elf and 4 humans means a 20% chance of
    // being an elf.
    const defaultJob = this.state.jobs[this.state.defaultJob];
    const counts: Record<string, number> = {};

    for (const [speciesId, entry] of Object.entries(this.state.species)) {
      counts[speciesId] = entry.count;
    }

    const birthSpecies = pickBirthSpecies(counts, this.random);
    if (!birthSpecies) {
      // Fallback: nobody has been counted yet, so use the default.
      if (defaultJob) {
        defaultJob.workers++;
        this.addSpecies(defaultJob, 1, DEFAULT_SPECIES_ID);
      }

      const species = this.state.species[DEFAULT_SPECIES_ID];
      if (species) {
        species.count++;
      }

      this.balanceWorkers();

      console.info(`A child (${DEFAULT_SPECIES_ID}) is born. Population is now ${this.getPopulation()}.`);

      return;
    }

    if (defaultJob) {
      defaultJob.workers++;
      this.addSpecies(defaultJob, 1, birthSpecies);
    }

    const species = this.state.species[birthSpecies];
    if (species) {
      species.count++;
    }

    this.balanceWorkers();

    console.info(`A child (${birthSpecies}) is born. Population is now ${this.getPopulation()}.`);
  }

  /**
   * The total people alive in the world.
   *
   * Population is derived from the species roster, so it can never drift
   * out of sync with the actual species counts.
   */
  getPopulation(): number {
    let total = 0;
    for (const entry of Object.values(this.state.species)) {
      total += entry.count;
    }

    return total;
  }

  /**
   * The people the huts and the city center can hold.
   *
   * Every hut counts, because a building is finished the moment it is paid
   * for. The city center provides its own housing from village creation.
   */
  getPopulationCapacity(): number {
    return this.state.cityCenter.housing
      + getPopulationCapacity(this.state.buildingCounts['hut'] ?? 0);
  }

  /**
   * The maximum amount of a resource the storage structures can hold.
   *
   * Gold is uncapped. Wood and stone share the city-center cap; food has
   * its own city-center cap. Research has its own city-center cap.
   * Each building that declares a storageBonus in the catalog adds its
   * per-copy amount to the relevant cap.
   */
  getMaxStorage(resource: 'wood' | 'stone' | 'food' | 'research'): number {
    let woodStoneBonus = 0;
    let foodBonus = 0;

    for (const type of BUILDING_TYPES) {
      const bonus = type.storageBonus;
      if (!bonus) {continue;}
      const count = this.state.buildingCounts[type.id] ?? 0;
      if (count === 0) {continue;}
      if (bonus.woodStone) {
        woodStoneBonus += count * bonus.woodStone;
      }
      if (bonus.food) {
        foodBonus += count * bonus.food;
      }
    }

    switch (resource) {
      case 'wood':
      case 'stone':
        return this.state.cityCenter.storageWoodStone + woodStoneBonus;
      case 'food':
        return this.state.cityCenter.storageFood + foodBonus;
      case 'research':
        return this.state.cityCenter.storageResearch;
    }
  }

  /**
   * Clamp all resources to their storage caps.
   *
   * Gold is never capped. Production can overshoot the cap within a tick,
   * so this is called after every production step.
   */
  private clampResources(): void {
    this.state.resources.wood = Math.min(
      this.state.resources.wood,
      this.getMaxStorage('wood'),
    );
    this.state.resources.stone = Math.min(
      this.state.resources.stone,
      this.getMaxStorage('stone'),
    );
    this.state.resources.food = Math.min(
      this.state.resources.food,
      this.getMaxStorage('food'),
    );
    this.state.resources.research = Math.min(
      this.state.resources.research,
      this.getMaxStorage('research'),
    );
  }

  // Build a building
  addBuilding(buildingId: string, cost?: Resource): boolean {
    const buildingType = getBuildingType(buildingId);
    if (!buildingType) {
      return false; // Unknown building type
    }

    const count = this.state.buildingCounts[buildingId] ?? 0;

    // Use provided cost or calculate scaled cost
    const buildingCost = cost ?? getScaledCost(buildingType.cost, count);

    // Check if player has enough resources
    if (this.state.resources.wood < buildingCost.wood
        || this.state.resources.stone < buildingCost.stone
        || this.state.resources.food < buildingCost.food
        || this.state.resources.gold < buildingCost.gold) {
      return false; // Not enough resources
    }

    // Deduct resources
    this.state.resources.wood -= buildingCost.wood;
    this.state.resources.stone -= buildingCost.stone;
    this.state.resources.food -= buildingCost.food;
    this.state.resources.gold -= buildingCost.gold;

    // Generate a unique instance key for this building
    const instanceIndex = this.buildingInstanceCounter[buildingId] ?? 0;
    this.buildingInstanceCounter[buildingId] = instanceIndex + 1;
    const instanceKey = `${buildingId}-${instanceIndex}`;

    // Add building to state. A building is finished the moment it is paid for.
    this.state.buildings[instanceKey] = {
      id: buildingId,
      name: buildingType.name,
      description: buildingType.description,
      cost: buildingCost,
    };

    this.state.buildingCounts[buildingId] = count + 1;
    this.applyBuildingEffects(buildingId);

    this.notify();

    return true;
  }

  /**
   * Assign workers to a job.
   *
   * The species of the people working the job is tracked alongside the
   * worker count, because a job's production depends on the stats of the
   * creatures working it. A job can be staffed by more than one species.
   *
   * When `speciesId` is omitted, the best available species for the job is
   * picked automatically, and the whole workforce is rebalanced afterwards.
   */
  assignWorkers(jobId: string, count: number, speciesId?: string): boolean {
    const job = this.state.jobs[jobId];
    if (!job) {return false;}

    if (count > 0) {
      const defaultJob = this.state.jobs[this.state.defaultJob];

      // No species specified — pick the best available, then rebalance.
      if (speciesId === undefined) {
        const roomInJob = job.capacity > 0
          ? Math.max(0, job.capacity - job.workers)
          : Infinity;

        if (roomInJob <= 0) {return true;}

        const remaining: Record<string, number> = {};
        for (const [sid, entry] of Object.entries(this.state.species)) {
          remaining[sid] = entry.count - this.getWorking(sid);
        }

        // Only species that still have free people.
        const sorted = this.sortedSpeciesForJob(job, remaining, this.state);
        const picked = sorted[0];

        if (!picked) {return true;}

        const canMove = Math.min(remaining[picked] ?? 0, roomInJob, count);
        if (canMove <= 0) {return true;}

        // People not in any job are taken first, then from the default job.
        const unassigned = defaultJob?.species[picked] ?? 0;
        const free = Math.max(
          0,
          (this.state.species[picked]?.count ?? 0) - unassigned - this.getWorking(picked),
        );
        const fromFree = Math.min(canMove, free);
        const fromDefault = canMove - fromFree;

        if (fromDefault > 0 && defaultJob) {
          defaultJob.workers = Math.max(0, defaultJob.workers - fromDefault);
          this.removeSpecies(defaultJob, fromDefault, picked);
        }

        job.workers += canMove;
        this.addSpecies(job, canMove, picked);
      } else {
        // Room in job (0 capacity = unlimited)
        const roomInJob = job.capacity > 0
          ? Math.max(0, job.capacity - job.workers)
          : Infinity;

        const unassigned = defaultJob?.species[speciesId] ?? 0;
        const free = Math.max(
          0,
          (this.state.species[speciesId]?.count ?? 0) - unassigned - this.getWorking(speciesId),
        );
        const availableOfSpecies = free + unassigned;

        const canMove = Math.min(availableOfSpecies, roomInJob, count);
        if (canMove <= 0) {return true;}

        const fromFree = Math.min(canMove, free);
        const fromDefault = canMove - fromFree;

        if (fromDefault > 0 && defaultJob) {
          defaultJob.workers = Math.max(0, defaultJob.workers - fromDefault);
          this.removeSpecies(defaultJob, fromDefault, speciesId);
        }

        job.workers += canMove;
        this.addSpecies(job, canMove, speciesId);
      }
    } else {
      const removing = Math.min(job.workers, Math.abs(count));
      job.workers -= removing;

      const leaving = this.takeSpecies(job, removing);

      if (jobId !== this.state.defaultJob) {
        const defaultJob = this.state.jobs[this.state.defaultJob];
        if (defaultJob) {
          defaultJob.workers += removing;

          for (const [id, leavingCount] of Object.entries(leaving)) {
            this.addSpecies(defaultJob, leavingCount, id);
          }
        }
      }
    }

    // Free the market slots held by merchants that are no longer assigned.
    this.marketSystem.trimAllocationsToMerchants();

    // Rebalance species across jobs without changing worker counts.
    this.balanceWorkers();

    this.notify();

    return true;
  }

  /**
   * How many people of a species are working a job.
   *
   * The default job is left out, because the people in it are the ones who
   * are not working anything yet.
   */
  private getWorking(speciesId: string): number {
    let working = 0;

    for (const job of Object.values(this.state.jobs)) {
      if (job.id === this.state.defaultJob) {
        continue;
      }

      working += job.species[speciesId] ?? 0;
    }

    return working;
  }

  /**
   * Record that `count` more people of `speciesId` work a job.
   */
  private addSpecies(job: Job, count: number, speciesId: string): void {
    if (count <= 0) {return;}

    job.species[speciesId] = (job.species[speciesId] ?? 0) + count;
  }

  /**
   * Record that `count` people stop working a job.
   *
   * The people who leave are taken from the largest group first, so a mixed
   * job empties out evenly rather than emptying one species first. The
   * groups are ordered by size and then by name, so the choice does not
   * depend on the order the species were added.
   */
  private takeSpecies(job: Job, count: number): Record<string, number> {
    const leaving: Record<string, number> = {};

    if (count <= 0) {
      return leaving;
    }

    let remaining = count;

    for (const speciesId of this.getSpeciesOrder(job)) {
      if (remaining <= 0) {break;}

      const have = job.species[speciesId] ?? 0;

      if (have <= 0) {continue;}

      const taken = Math.min(have, remaining);

      leaving[speciesId] = taken;
      remaining -= taken;

      if (taken >= have) {
        delete job.species[speciesId];
      } else {
        job.species[speciesId] = have - taken;
      }
    }

    return leaving;
  }

  /**
   * The species working a job, largest group first.
   */
  private getSpeciesOrder(job: Job): string[] {
    return Object.keys(job.species).sort((a, b) => {
      const difference = (job.species[b] ?? 0) - (job.species[a] ?? 0);

      if (difference !== 0) {
        return difference;
      }

      return a.localeCompare(b);
    });
  }

  /**
   * Record that `count` people of `speciesId` stop working a job.
   */
  private removeSpecies(job: Job, count: number, speciesId: string): void {
    if (count <= 0) {return;}

    const have = job.species[speciesId] ?? 0;
    const removed = Math.min(have, count);

    if (removed >= have) {
      delete job.species[speciesId];
    } else {
      job.species[speciesId] = have - removed;
    }
  }

  /**
   * Move a job up or down in the priority order.
   *
   * The order the player sees is the order of the jobs that are available.
   * A job moves one place among those, so a job that is not on screen does
   * not get in the way.
   *
   * @param direction -1 to move the job up, 1 to move it down.
   */
  moveJob(jobId: string, direction: -1 | 1): boolean {
    if (!this.state.jobs[jobId]) {return false;}

    // Defaultable jobs are locked at the bottom and cannot be moved.
    if (JOBS[jobId]?.canDefault) {return false;}

    const visible = getAvailableJobIds(this.state.buildingCounts, this.state.jobOrder);
    const index = visible.indexOf(jobId);

    if (index < 0) {return false;}

    const neighbour = visible[index + direction];

    // The neighbour is a defaultable job — refuse, because the defaultable
    // block is locked at the bottom.
    if (!neighbour || JOBS[neighbour]?.canDefault) {return false;}

    // The two jobs swap places in the full order, so the order stays a
    // permutation of every job.
    const order = this.state.jobOrder;
    const first = order.indexOf(jobId);
    const second = order.indexOf(neighbour);

    if (first < 0 || second < 0) {return false;}

    order[first] = neighbour;
    order[second] = jobId;

    this.balanceWorkers();

    this.notify();

    return true;
  }
  /**
   * Move a job to a given place in the priority order.
   *
   * The place is counted among the jobs the player can see, so a job that is
   * not on screen does not take a spot.
   *
   * @param jobId - The job to move.
   * @param targetIndex - The place to move it to, counted among the visible jobs.
   */
  reorderJob(jobId: string, targetIndex: number): boolean {
    if (!this.state.jobs[jobId]) {return false;}

    const visible = getAvailableJobIds(this.state.buildingCounts, this.state.jobOrder);
    const from = visible.indexOf(jobId);

    if (from < 0) {return false;}

    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= visible.length) {
      return false;
    }

    if (from === targetIndex) {return false;}

    // The job leaves its place and goes to the new one.
    const nextVisible = [...visible];
    const [moved] = nextVisible.splice(from, 1);

    if (moved === undefined) {return false;}

    nextVisible.splice(targetIndex, 0, moved);

    // The visible jobs keep the places they hold in the full order, so a job
    // that is not on screen stays where it was.
    const order = this.state.jobOrder;
    const slots: number[] = [];

    order.forEach((id, index) => {
      if (visible.includes(id)) {
        slots.push(index);
      }
    });

    nextVisible.forEach((id, index) => {
      const slot = slots[index];

      if (slot !== undefined) {
        order[slot] = id;
      }
    });

    this.balanceWorkers();

    this.notify();

    return true;
  }

  /**
   * True when the player has enough gold to rebirth.
   *
   * A rebirth costs gold, and the gold is spent by throwing the world away,
   * so the world never carries a gold balance across a rebirth.
   */
  canRebirth(): boolean {
    return this.state.resources.gold >= REBIRTH_GOLD_COST;
  }

  /**
   * The rebirth the player is in the middle of.
   *
   * It is absent while no rebirth is pending. The rolls were made when the
   * rebirth began, so the numbers the player was shown are the numbers the
   * rebirth gives.
   */
  getPendingRebirth(): PendingRebirth | null {
    return this.state.pendingRebirth ?? null;
  }

  /**
   * Start a rebirth.
   *
   * The world is not thrown away yet: the player is shown what the rebirth
   * brings and confirms it. The rolls are made here and kept, so a reload
   * does not roll again.
   *
   * Each species rolls its own stat increases: the rolls of one race do not
   * help another race. The composition of the next village is set to all
   * humans by default, and the player can change it before confirming.
   */
  beginRebirth(): boolean {
    if (!this.canRebirth()) {
      return false;
    }

    if (this.state.pendingRebirth) {
      return false;
    }

    // The gold rebirth grants one elf to the pool.
    // If the new species is not yet in the world roster, add it now so
    // confirmRebirth can find it as a template.
    this.state.rebirthPool = {
      human: REBIRTH_LIVES,
      elf: (this.state.rebirthPool?.elf ?? 0) + 1,
    };

    if (!this.state.species['elf'] && this.state.rebirthPool.elf > 0) {
      const template = SPECIES.find((s) => s.id === 'elf');

      if (template) {
        this.state.species['elf'] = {
          id: 'elf',
          name: template.name,
          description: template.description,
          stats: { ...template.baseStats },
          count: 0,
        };
      }
    }

    // Species already in the roster.
    const speciesIds = new Set(Object.keys(this.state.species));

    // Species from the rebirth pool that are not in the roster yet.
    for (const [speciesId, count] of Object.entries(this.state.rebirthPool ?? {})) {
      if ((count ?? 0) > 0 && !speciesIds.has(speciesId)) {
        speciesIds.add(speciesId);
      }
    }

    const before: PendingRebirth['before'] = {};

    for (const speciesId of speciesIds) {
      const entry = this.state.species[speciesId];

      if (entry) {
        before[speciesId] = { ...entry.stats };
      } else {
        // Not yet in the roster; use the catalog's base stats.
        const template = SPECIES.find((s) => s.id === speciesId);

        if (template) {
          before[speciesId] = { ...template.baseStats };
        }
      }
    }

    const speciesStats: Record<string, Stats> = {};
    const speciesCounts: Record<string, number> = {};

    for (const speciesId of speciesIds) {
      const entry = this.state.species[speciesId];

      if (entry) {
        speciesStats[speciesId] = entry.stats;
        speciesCounts[speciesId] = entry.count;
      } else {
        const template = SPECIES.find((s) => s.id === speciesId);

        if (template) {
          speciesStats[speciesId] = { ...template.baseStats };
          speciesCounts[speciesId] = 0;
        }
      }
    }

    const after = getRebirthStatsPerSpecies(speciesStats, speciesCounts, this.random);

    // Default composition: all lives are humans, minus any elves already
    // earned.  The player can change the split before confirming.
    const pool = this.state.rebirthPool;
    const composition: Record<string, number> = {
      [DEFAULT_SPECIES_ID]: pool?.human ?? REBIRTH_LIVES,
    };

    const earnedElves = pool?.elf ?? 0;

    if (earnedElves > 0 && (composition[DEFAULT_SPECIES_ID] ?? 0) > 0) {
      const elves = Math.min(earnedElves, composition[DEFAULT_SPECIES_ID] ?? 0);

      composition[DEFAULT_SPECIES_ID] = (composition[DEFAULT_SPECIES_ID] ?? 0) - elves;
      composition['elf'] = elves;
    }

    this.state.pendingRebirth = { before, after, composition };

    this.notify();

    return true;
  }

  /**
   * Carry out the pending rebirth.
   *
   * The world is replaced by a new one, built from the player's chosen
   * composition. The player earns one elf in the rebirth pool for each
   * village they leave behind. Jobs are auto-staffed by species quality.
   */
  confirmRebirth(): boolean {
    const pending = this.state.pendingRebirth;

    if (!pending) {
      return false;
    }

    const next = createInitialState();

    // The pool persists into the new world as the player left it.
    next.rebirthPool = { ...this.state.rebirthPool };

    // The player's preferred job order persists into the new world.
    next.jobOrder = [...this.state.jobOrder];

    // Build the new village's population from the chosen composition.
    const comp = pending.composition;

    // Add any species from the composition that are not in the new world
    // yet (e.g. elf), so they have an entry before we assign counts or
    // copy improved stats.
    for (const [speciesId, count] of Object.entries(comp)) {
      if (count > 0 && !next.species[speciesId]) {
        const template = this.state.species[speciesId];

        if (template) {
          next.species[speciesId] = {
            id: speciesId,
            name: template.name,
            description: template.description,
            stats: { ...template.stats },
            count: 0,
          };
        }
      }
    }

    // The species carry their improved stats into the new world. A species
    // the new world does not know about is skipped, because there is no way
    // to put it in the roster.
    for (const [speciesId, stats] of Object.entries(pending.after)) {
      const entry = next.species[speciesId];

      if (!entry) {
        continue;
      }

      entry.stats = { ...stats };
    }

    // Set the species counts from the composition, then the population is
    // derived from them.
    for (const [speciesId, count] of Object.entries(comp)) {
      const entry = next.species[speciesId];

      if (!entry || count <= 0) {
        continue;
      }

      entry.count = count;
    }

    // Staff the jobs by species quality, then load the world.
    this.autoStaffJobs(next);

    if (DEBUG) {
      console.info('[debug] confirmRebirth — composition:', JSON.stringify(comp),
        '→ species before load:', Object.keys(next.species),
        '→ species counts:', JSON.stringify(Object.fromEntries(Object.entries(next.species).map(([id, e]) => [id, e.count]))),
        '→ old pool:', JSON.stringify(this.state.rebirthPool),
        '→ new pool:', JSON.stringify(next.rebirthPool));
    }

    this.loadState(next);

    console.info('The world was reborn. The people carry better genes.');

    return true;
  }

  /**
   * Rebalance species across jobs while preserving each job's worker count.
   *
   * Each job keeps its current number of workers; only the species
   * composition changes.  Jobs are processed in priority order so that
   * higher-priority jobs get the best species first.
   */
  balanceWorkers(): void {
    const state = this.state;

    // Snapshot each job's current worker count — these must not change.
    const preservedWorkers: Record<string, number> = {};
    for (const [jobId, job] of Object.entries(state.jobs)) {
      preservedWorkers[jobId] = job.workers;
    }

    // Put everyone back into the default job.
    const defaultJob = state.jobs[state.defaultJob];
    for (const job of Object.values(state.jobs)) {
      if (job !== defaultJob) {
        job.workers = 0;
      }
      job.species = {};
    }
    if (defaultJob) {
      defaultJob.workers = 0;
      defaultJob.species = {};
      for (const [speciesId, entry] of Object.entries(state.species)) {
        if (entry.count > 0) {
          defaultJob.species[speciesId] = entry.count;
          defaultJob.workers += entry.count;
        }
      }
    }

    // Track how many of each species are still free to assign.
    const remaining: Record<string, number> = {};
    for (const [speciesId, entry] of Object.entries(state.species)) {
      remaining[speciesId] = entry.count;
    }

    // Fill non-default jobs in priority order, capped at their preserved
    // worker count. The default job keeps whatever is left over.
    for (const jobId of state.jobOrder) {
      const job = state.jobs[jobId];
      if (!job || job === defaultJob) continue;

      const target = preservedWorkers[jobId] ?? 0;
      if (target <= 0) continue;

      let filled = 0;

      const sortedSpecies = this.sortedSpeciesForJob(job, remaining, state);

      for (const speciesId of sortedSpecies) {
        if (filled >= target) {
          break;
        }

        const canTake = Math.min(remaining[speciesId] ?? 0, target - filled);

        if (canTake <= 0) {
          continue;
        }

        remaining[speciesId] = (remaining[speciesId] ?? 0) - canTake;
        job.workers += canTake;
        job.species[speciesId] = canTake;
        filled += canTake;

        if (defaultJob) {
          defaultJob.workers -= canTake;
          defaultJob.species[speciesId] = Math.max(
            0,
            (defaultJob.species[speciesId] ?? 0) - canTake,
          );
        }
      }
    }
  }

  /**
   * Staff the jobs in a given world state by species quality, filling
   * capacity-limited jobs from scratch.
   *
   * Used during rebirth to staff the new world before it is loaded.
   */
  private autoStaffJobs(state: WorldState): void {
    // Swap the engine's state pointer temporarily, run balance, restore.
    const saved = this.state;
    this.state = state;

    // Clear all job assignments so rebirth fills from scratch.
    for (const job of Object.values(state.jobs)) {
      job.workers = 0;
      job.species = {};
    }

    this.balanceWorkers();
    this.state = saved;
  }

  /**
   * Species sorted by how well they perform a job, best first.
   *
   * Only species that have remaining free people are considered.
   */
  private sortedSpeciesForJob(
    job: Job,
    remaining: Record<string, number>,
    state: WorldState,
  ): string[] {
    const jobStats = JOB_STATS[job.id];

    const scored: { speciesId: string; score: number }[] = [];

    for (const [speciesId, count] of Object.entries(remaining)) {
      if (count <= 0) {
        continue;
      }

      const stats = state.species[speciesId]?.stats;

      if (!stats) {
        continue;
      }

      const score = jobStats ? getJobFactor(jobStats, stats) : 1;

      scored.push({ speciesId, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.map((entry) => entry.speciesId);
  }

  /**
   * The rebirth pool.
   *
   * Tells the UI what races the player can pick from.
   */
  getRebirthPool(): WorldState['rebirthPool'] {
    return this.state.rebirthPool;
  }

  /**
   * Update the composition of the next village.
   *
   * The player picks which races make up the 5 lives. The engine only
   * stores the change; it is not applied until the player confirms.
   */
  setComposition(composition: Record<string, number>): boolean {
    if (!this.state.pendingRebirth) {
      return false;
    }

    this.state.pendingRebirth.composition = { ...composition };

    this.notify();

    return true;
  }

  /**
   * Abandon the pending rebirth and go back to the village.
   *
   * The world is left exactly as it was, so the player can think about it
   * and come back.
   */
  cancelRebirth(): boolean {
    if (!this.state.pendingRebirth) {
      return false;
    }

    delete this.state.pendingRebirth;

    this.notify();

    return true;
  }

  // Set the default job (where new workers go)
  setDefaultJob(jobId: string): boolean {
    const job = this.state.jobs[jobId];
    if (!job || !job.canDefault) {return false;}

    this.state.defaultJob = jobId;
    this.notify();

    return true;
  }

  // Get merchant count from market system
  getMerchantCount(): number {
    return this.marketSystem.getMerchantCount();
  }

  /** True once a market has been built. */
  isMarketBuilt(): boolean {
    return this.marketSystem.isMarketBuilt();
  }

  /** Caravanserai that are completed. */
  getCaravanseraiCount(): number {
    return this.marketSystem.getCaravanseraiCount();
  }

  /** Total trade positions the merchants can carry per tick, in each direction. */
  getTradeCapacity(): number {
    return this.marketSystem.getTradeCapacity();
  }

  /** The current per-tick market orders. */
  getMarketOrders(): MarketOrders {
    return this.marketSystem.getOrders();
  }

  /**
   * Net resource change per tick that the market orders will settle.
   *
   * The engine plans the tick's trades from the current state, so this
   * matches what actually settles.
   */
  getMarketTickRates(): Resource {
    return this.marketSystem.getTickRates();
  }

  /**
   * Net resource change per second from the market orders alone.
   *
   * This is the market's own contribution, so it holds no job production.
   * A job that makes gold later does not show up here; the market panel
   * reports what the exchanges earn.
   */
  getMarketRates(): Resource {
    const tickRates = this.marketSystem.getTickRates();
    const ticksPerSecond = 1000 / this.tickRate;

    return {
      wood: tickRates.wood * ticksPerSecond,
      stone: tickRates.stone * ticksPerSecond,
      food: tickRates.food * ticksPerSecond,
      gold: tickRates.gold * ticksPerSecond,
      research: tickRates.research * ticksPerSecond,
    };
  }

  /**
   * The units bought and sold per second, split by direction.
   *
   * The quantities come from the plan for the next tick, so they are what
   * actually settles: a buy that cannot be paid for is left out.
   */
  getMarketFlow(): MarketFlow {
    return this.marketSystem.getFlow(1000 / this.tickRate);
  }

  /**
   * Allocate `count` units of `resource` to be bought or sold per tick.
   *
   * Every unit occupies one of the merchants' trades, so the total quantity
   * for an action is capped at the capacity the merchant count provides.
   */
  setMarketAllocation(action: MarketAction, resource: MarketResource, count: number): boolean {
    const allocated = this.marketSystem.setAllocation(action, resource, count);

    if (allocated) {
      this.notify();
    }

    return allocated;
  }

  /** Trades still free for `action`. */
  getFreeMarketTrades(action: MarketAction): number {
    return this.marketSystem.getFreeTrades(action);
  }

  /**
   * Release the buy and the sell order for `resource`.
   *
   * The resource stops being traded and the trades both orders held are
   * freed.
   */
  clearMarketAllocation(resource: MarketResource): boolean {
    const cleared = this.marketSystem.clearAllocations(resource);

    if (cleared) {
      this.notify();
    }

    return cleared;
  }

  /** The price the player pays to buy one unit of `resource`. */
  getBuyPrice(resource: MarketResource): number {
    return this.marketSystem.getBuyPrice(resource);
  }

  /** The price the player receives for selling one unit of `resource`. */
  getSellPrice(resource: MarketResource): number {
    return this.marketSystem.getSellPrice(resource);
  }

  /** The resources that can be traded at the market. */
  getMarketResources(): MarketResource[] {
    return [...MARKET_RESOURCES];
  }

  /**
   * Net resource change per tick, derived from the staffed jobs and the
   * market orders.
   *
   * This is the authoritative source for the rates shown in the UI. It is
   * computed from the job table rather than from a before/after snapshot of
   * the resource amounts, so one-off events (building costs, market trades)
   * cannot leak into the rate.
   */
  getTickRates(): Resource {
    const rates: Resource = { wood: 0, stone: 0, food: 0, gold: 0, research: 0 };

    for (const job of Object.values(this.state.jobs)) {
      if (job.workers <= 0) {continue;}

      // Production is scaled by the stats of the people working the job.
      // Consumption is not: every worker eats the same.
      const factor = this.getJobFactor(job);

      for (const key of RESOURCE_KEYS) {
        rates[key] += (job.production[key] * factor - job.consumption[key]) * job.workers;
      }
    }

    const marketRates = this.marketSystem.getTickRates();
    for (const key of RESOURCE_KEYS) {
      rates[key] += marketRates[key];
    }

    // Species-based consumption and research from the whole population.
    for (const [speciesId, entry] of Object.entries(this.state.species)) {
      if (entry.count <= 0) {continue;}

      const speciesData = SPECIES.find((s) => s.id === speciesId);
      if (!speciesData) {continue;}

      rates.food -= speciesData.baseConsumption.food * entry.count;
      rates.wood -= speciesData.baseConsumption.wood * entry.count;
      rates.stone -= speciesData.baseConsumption.stone * entry.count;
      rates.gold -= speciesData.baseConsumption.gold * entry.count;
      rates.research += speciesData.baseResearch * entry.count;
    }

    return rates;
  }

  /**
   * Net resource change per second, derived from the per-tick rate.
   *
   * The engine runs at a fixed 5 ticks per second, multiplied by the tick
   * multiplier. The per-second rate is the per-tick rate multiplied by the
   * effective tick frequency.
   */
  getResourceRates(): Resource {
    const tickRates = this.getTickRates();
    const ticksPerSecond = (1000 / this.tickRate) * this.tickMultiplier;

    return {
      wood: tickRates.wood * ticksPerSecond,
      stone: tickRates.stone * ticksPerSecond,
      food: tickRates.food * ticksPerSecond,
      gold: tickRates.gold * ticksPerSecond,
      research: tickRates.research * ticksPerSecond,
    };
  }

  // Update method for external control
  update(_deltaTime: number): void {
    // For now, we'll just call tick directly
    // In a more sophisticated implementation, we might interpolate between ticks
    this.tick();
  }

  /**
   * Debug cheat: add resources to the player.
   */
  debugAddResources(amount: number): void {
    this.state.resources.wood += amount;
    this.state.resources.stone += amount;
    this.state.resources.food += amount;
    this.state.resources.gold += amount;
    this.state.resources.research += amount;
    this.notify();
  }

  /**
   * The catalog of all technologies.
   */
  getTechnologyCatalog(): TechnologyType[] {
    return [...TECHNOLOGIES];
  }

  /**
   * Whether a technology has been researched.
   */
  isTechnologyResearched(techId: string): boolean {
    return this.state.researchedTechnologies.includes(techId);
  }

  /**
   * Whether a technology's prereqs are all met.
   */
  canResearch(techId: string): boolean {
    const tech = getTechnology(techId);
    if (!tech) {return false;}
    if (this.isTechnologyResearched(techId)) {return false;}

    return tech.prereqs.every((prereq) => this.isTechnologyResearched(prereq));
  }

  /**
   * Whether the player can afford the research cost.
   */
  canAffordResearch(techId: string): boolean {
    const tech = getTechnology(techId);
    if (!tech) {return false;}

    return this.state.resources.research >= (tech.cost.research ?? 0);
  }

  /**
   * Research a technology.
   *
   * Deducts the research cost, marks the technology as researched, and
   * unlocks any buildings it grants.
   */
  researchTechnology(techId: string): boolean {
    const tech = getTechnology(techId);
    if (!tech) {return false;}
    if (!this.canResearch(techId)) {return false;}
    if (!this.canAffordResearch(techId)) {return false;}

    this.state.resources.research -= tech.cost.research ?? 0;
    this.state.researchedTechnologies.push(techId);

    // Unlock buildings this technology grants
    for (const buildingId of tech.unlocksBuildings) {
      if (!this.state.unlockedBuildings.includes(buildingId)) {
        this.state.unlockedBuildings.push(buildingId);
      }
    }

    this.notify();

    return true;
  }
}

export default GameEngine;
