/**
 * INTERACTION GUARD
 *
 * Discord invalidates an interaction token 3 seconds after it stamps it. Any
 * handler that does REST work before answering is racing that clock, and losing
 * the race shows the user "Siggy didn't respond in time" even when the work
 * itself succeeded — bills marked paid, invoices written, messages redrawn, all
 * invisible because the acknowledgement arrived late.
 *
 * Deferring inside each handler fixes that handler and nothing else: the next
 * one that grows a REST call reopens the same hole. This guards the token
 * centrally instead. Every interaction gets a watchdog that acknowledges it
 * shortly before the deadline, and the response methods are rewired so a
 * handler that answers afterwards still lands rather than throwing
 * InteractionAlreadyReplied.
 *
 * The guard is a net, not a licence: whenever it fires it logs the customId or
 * command name so the slow handler can be deferred properly at its own top.
 */

// Fire well inside the 3s window. The token is stamped when the user clicks,
// not when we receive it, so the gateway hop is already spent by the time a
// handler starts — see the age= figure logged for buttons.
const ACK_AT_MS = 2000;

function describe(interaction) {
  if (interaction.isChatInputCommand?.()) return `/${interaction.commandName}`;
  if (interaction.isModalSubmit?.()) return `modal:${interaction.customId}`;
  if (interaction.customId) return `component:${interaction.customId}`;
  return 'interaction';
}

/**
 * Arm the guard. Returns a disarm function the dispatcher must call once the
 * handler settles, so a fast interaction never pays for the timer.
 */
function guardInteraction(interaction) {
  const nativeReply = interaction.reply?.bind(interaction);
  const nativeUpdate = interaction.update?.bind(interaction);

  // Components are acknowledged with deferUpdate so the message the user
  // clicked stays exactly as it was — no "Siggy is thinking..." on a public
  // invoice card. Commands and modal submits have no prior message to keep, so
  // they get a real deferred reply.
  const isComponent = !!(interaction.isButton?.() || interaction.isAnySelectMenu?.());

  let rescued = false;

  const timer = setTimeout(async () => {
    if (interaction.replied || interaction.deferred) return;
    try {
      if (isComponent) await interaction.deferUpdate();
      else await interaction.deferReply();
      rescued = true;
      const age = Date.now() - interaction.createdTimestamp;
      console.warn(
        `[guard] ${describe(interaction)} belum jawab setelah ${age}ms — token diselamatkan. ` +
        `Handler ini harusnya defer sendiri di awal.`
      );
    } catch (err) {
      console.error(`[guard] gagal nyelametin ${describe(interaction)}: ${err.message}`);
    }
  }, ACK_AT_MS);

  // Rewire only after a rescue. An interaction that answered on its own keeps
  // the stock behaviour, including its own ephemeral choices.
  if (nativeReply) {
    interaction.reply = async (options) => {
      if (!rescued) return nativeReply(options);
      // After deferUpdate the original message is the "reply", so a handler
      // asking to reply wants a new message on top of it.
      if (isComponent) return interaction.followUp(options);
      return interaction.editReply(stripEphemeral(options));
    };
  }

  if (nativeUpdate) {
    interaction.update = async (options) => {
      if (!rescued) return nativeUpdate(options);
      // deferUpdate already claimed the original message; editReply is how you
      // edit it from here.
      return interaction.editReply(stripEphemeral(options));
    };
  }

  return () => clearTimeout(timer);
}

// editReply rejects the ephemeral flag — ephemerality is fixed at defer time.
// Dropping it is what makes a rescued ephemeral reply land at all; the content
// is what matters, and the alternative is the user seeing nothing.
function stripEphemeral(options) {
  if (!options || typeof options === 'string') return options;
  const { ephemeral, flags, ...rest } = options;
  return rest;
}

module.exports = { guardInteraction, ACK_AT_MS };
