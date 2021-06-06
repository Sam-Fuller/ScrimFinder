import { connectDB } from './database/database';
import discord from 'discord.js';
import dotenv from 'dotenv';
import { onMessageReceived } from './handlers/messageHandler';

dotenv.config();
export const client = new discord.Client();

client.once(`ready`, () => {
    client.user?.setActivity(`!scrim`, {
        type: `PLAYING`,
    });
});

client.login(process.env.BOT_TOKEN);

connectDB();

client.on(`message`, async (message) => {
    if (message.author.bot) return;

    await connectDB();
    await onMessageReceived(message);
});
