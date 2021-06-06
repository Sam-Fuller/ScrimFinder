import { Message } from 'discord.js';
import { sendServerMenu } from '../helpers/server';
import { sendStartMenu } from '../helpers/application';

export const onMessageReceived = async (message: Message): Promise<void> => {
    if (message.guild) {
        await onServerMessageReceived(message);
    } else {
        await onDirectMessageRecived(message);
    }
};

export const onDirectMessageRecived = async (
    message: Message,
): Promise<void> => {
    if (message.content.toLowerCase() === `!scrim`) sendStartMenu(message);
};

export const onServerMessageReceived = (message: Message): void => {
    if (message.content.toLowerCase() === `!scrim`) sendServerMenu(message);
};
