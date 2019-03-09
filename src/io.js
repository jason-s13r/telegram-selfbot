const sendMessage = async (client, chat_id, reply_to_message_id, text) =>
  await client.invoke({
    _: 'sendMessage',
    chat_id: chat_id,
    reply_to_message_id: reply_to_message_id || undefined,
    input_message_content: {
        _: 'inputMessageText',
        text: {
          _: 'formattedText',
          text
        }
      }
  });

const getMessageDetails = async (client, chat_id, from_message_id) => {
  const messages = await client.invoke({
    _: 'getChatHistory',
    chat_id: chat_id,
    from_message_id: from_message_id,
    offset: -1,
    limit: 2
  });

  return messages.messages[0];
};

module.exports = { sendMessage, getMessageDetails };
