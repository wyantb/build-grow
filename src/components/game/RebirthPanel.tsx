import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { REBIRTH_GOLD_COST } from '../../systems/gameEngine.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';

/**
 * The rebirth tab of the village.
 *
 * The tab only appears once the player has the gold for a rebirth. The
 * button has two steps, so a rebirth is never a single stray click: the
 * first click asks for a confirmation, and the second one carries it out.
 */
const RebirthPanel: Component = () => {
  const gameState = getGameState();

  // Whether the second button is showing. It is local to the panel, so
  // leaving the tab and coming back starts over.
  const [confirming, setConfirming] = createSignal(false);

  const gold = () => gameState.getResources().gold;
  const ready = () => gameState.canRebirth();

  /**
   * Start the rebirth.
   *
   * The world is not thrown away yet: the player is taken to the rebirth
   * view, where they see what changes and confirm it.
   */
  const startRebirth = () => {
    if (!gameState.beginRebirth()) {
      return;
    }

    setConfirming(false);
  };

  return (
    <div class="rebirth-panel">
      <h2>Rebirth</h2>

      <p class="rebirth-intro">
        A rebirth throws the village away and starts a new one, but the people
        carry better genes into it. It costs {formatNumber(REBIRTH_GOLD_COST)} gold.
      </p>

      <div class="action-buttons">
        <button
          class="action-button"
          id="gold-rebirth-button"
          type="button"
          hidden={confirming()}
          disabled={!ready()}
          onClick={() => setConfirming(true)}
        >
          Gold Rebirth
        </button>

        <Tooltip
          content="The village is thrown away. This cannot be undone."
          placement="top"
        >
          <button
            class="action-button action-button-danger"
            id="really-rebirth-button"
            type="button"
            hidden={!confirming()}
            onClick={startRebirth}
          >
            Really Rebirth?
          </button>
        </Tooltip>
      </div>

      {!ready() && (
        <p class="rebirth-progress">
          Gold: {formatNumber(gold())} / {formatNumber(REBIRTH_GOLD_COST)}
        </p>
      )}
    </div>
  );
};

export default RebirthPanel;
