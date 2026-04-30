// This will be the consolidated interaction handler to prevent conflicts
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      
      // Cooldown and Channel checks
      const userId = interaction.user.id;
      const channelId = interaction.channelId;
      const guildId = interaction.guildId;
      
      if (!isChannelAllowed(guildId, channelId)) {
        return interaction.reply({
          content: '❌ Bot commands are only allowed in specific channels.',
          ephemeral: true
        });
      }
      
      const remainingCooldown = checkCooldown(userId, commandName);
      if (remainingCooldown > 0) {
        const seconds = Math.ceil(remainingCooldown / 1000);
        return interaction.reply({
          content: `⏳ Please wait ${seconds} second${seconds > 1 ? 's' : ''} before using another command.`,
          ephemeral: true
        });
      }
      
      updateCooldown(userId, commandName);
      
      // Execute commands
      switch (commandName) {
        case 'check': await handleCheck(interaction); break;
        case 'research': await handleResearch(interaction); break;
        case 'transform': await handleTransform(interaction); break;
        case 'mood': await handleMood(interaction); break;
        case 'reset': await handleReset(interaction); break;
        case 'stats': await handleStats(interaction); break;
        case 'top': await handleTop(interaction); break;
        case 'help': await handleHelp(interaction); break;
        case 'price': await handlePrice(interaction); break;
        case 'trending': await handleTrending(interaction); break;
        case 'chart': await handleChart(interaction); break;
        case 'leaderboard':
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'start') await handleLeaderboardStart(interaction);
          else if (subcommand === 'add') await handleLeaderboardAdd(interaction);
          else if (subcommand === 'end') await handleLeaderboardEnd(interaction);
          break;
        case 'invoice-recap': await handleInvoiceRecap(interaction); break;
        case 'invoice-search': await handleInvoiceSearch(interaction); break;
        case 'invoice-analytics': await handleInvoiceAnalytics(interaction); break;
        case 'invoice-delete': await handleInvoiceDelete(interaction); break;
        case 'invoice-clear': await handleInvoiceClear(interaction); break;
        case 'invoice-owe': await handleInvoiceOwe(interaction); break;
        case 'invoice-merge': await handleInvoiceMerge(interaction); break;
        case 'payment-set': await handlePaymentSet(interaction); break;
        case 'invoice-link': await handleInvoiceLink(interaction); break;
        case 'bayar': await handleBayar(interaction); break;
        default: await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
      return;
    }

    // 2. Handle Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;
      
      if (customId.startsWith('copy_')) {
        const embed = interaction.message.embeds[0];
        const content = embed ? embed.description : 'No content';
        const title = embed ? embed.title : '';
        return interaction.reply({
          content: `📋 **Message copied!**\n\`\`\`\n${title ? title + '\n\n' : ''}${content.slice(0, 1900)}\n\`\`\``,
          ephemeral: true,
        });
      }
      
      if (customId.startsWith('like_') || customId.startsWith('dislike_')) {
        return interaction.reply({
          content: customId.startsWith('like_') ? '👍 You liked this message!' : '👎 You disliked this message.',
          ephemeral: true,
        });
      }
      
      if (customId.startsWith('reload_')) {
        // ... (Reload logic here)
      }
      
      // Invoice Buttons
      if (customId.startsWith('invoice_pay_')) return handleInvoiceButton(interaction, 'pay');
      if (customId.startsWith('invoice_bayar_')) return handleInvoiceButton(interaction, 'bayar');
      if (customId.startsWith('invoice_settle_')) return handleInvoiceButton(interaction, 'settle');
      if (customId.startsWith('invoice_add_')) return handleInvoiceButton(interaction, 'add');
      if (customId.startsWith('invoice_del_')) return handleInvoiceButton(interaction, 'delete');
      if (customId.startsWith('mark_paid_page_')) return handleMarkPaidPage(interaction);
      if (customId.startsWith('analytics_prev_')) return handleAnalyticsPagination(interaction, 'prev');
      if (customId.startsWith('analytics_next_')) return handleAnalyticsPagination(interaction, 'next');
      if (customId.startsWith('payment_confirm|')) return handlePaymentConfirm(interaction, 'confirm');
      if (customId.startsWith('payment_reject|')) return handlePaymentConfirm(interaction, 'reject');
      
      return;
    }

    // 3. Handle Select Menus
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      if (customId.startsWith('mark_paid_select_')) return handleMarkPaidSelect(interaction);
      if (customId === 'delete_invoice_select') return handleDeleteInvoiceSelect(interaction);
      if (customId === 'find_debt_select') return handleFindDebtSelect(interaction);
      if (customId === 'bayar_select_invoice') return handleBayarSelectInvoice(interaction);
      if (customId.startsWith('bayar_select_person_')) return handleBayarSelectPerson(interaction);
      return;
    }

    // 4. Handle Modal Submits
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      if (customId === 'invoice_create_modal') return processInvoiceCreateModal(interaction);
      if (customId.startsWith('mark_paid_modal_')) return processMarkPaidModal(interaction, customId.replace('mark_paid_modal_', ''));
      if (customId.startsWith('add_people_modal_')) return handleAddPeopleSubmit(interaction);
      if (customId === 'payment_set_modal') return processPaymentSetModal(interaction);
      return;
    }

  } catch (error) {
    console.error('[Interaction Handler] Global Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => {});
    } else if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ Error: ${error.message}`, components: [] }).catch(() => {});
    }
  }
});
