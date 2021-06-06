import { ADD_EMOTE, LIST_EMOTE } from './emoji';
import { Message, MessageEmbed } from 'discord.js';

import { Scrim } from '../types/scrim';
import { getAllScrims } from './scrim';
import { scrimDB } from '../database/database';

export const sendServerMenu = async (message: Message) => {
    const teamEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Menu`)
        .setDescription(
            `React with ${ADD_EMOTE} to create a create scrim.\nReact with ${LIST_EMOTE} to view all scrims.`,
        );

    const menuMessage = await message.reply(teamEmbed);

    await menuMessage.react(ADD_EMOTE);
    await menuMessage.react(LIST_EMOTE);

    menuMessage
        .awaitReactions(
            (reaction) => [ADD_EMOTE, LIST_EMOTE].includes(reaction.emoji.name),
            {
                max: 1,
                time: 60000,
                errors: [`time`],
            },
        )
        .then(async (reactions) => {
            const reaction = reactions.first();

            if (reaction?.emoji.name === ADD_EMOTE) {
                await startScrimCreate(message);
            } else if (reaction?.emoji.name === LIST_EMOTE) {
                await displayScrims(message);
            }
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

const displayScrims = async (message: Message) => {
    const displayScrimsEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Give the scrim a description`);

    const scrims = await getAllScrims();
    const teamName = process.env.TEAM_NAME;

    scrims.forEach((scrim, index) => {
        if (scrim.application) {
            displayScrimsEmbed.addField(
                `${index + 1}.    ${scrim.title}`,
                `${teamName}    v    ${
                    scrim.application.teamName
                }\nContact: <@${scrim.application?.userId}>\n${new Date(
                    scrim.startTime || ``,
                ).toUTCString()}`,
            );
        } else {
            displayScrimsEmbed.addField(
                `${index + 1}.    ${scrim.title}`,
                `${new Date(scrim.startTime || ``).toUTCString()}`,
            );
        }
    });

    message.reply(displayScrimsEmbed);
};

const startScrimCreate = async (message: Message) => {
    const scrimDescriptionEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Give the scrim a description`)
        .setFooter(`Step 1/2`);

    (await message.reply(scrimDescriptionEmbed)).channel
        .awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: [`time`],
        })
        .then(async (scrimDescriptionMessage) => {
            const scrimDescription
                = scrimDescriptionMessage.first()?.content || ``;

            const scrim: Scrim = {
                title: scrimDescription,
            };

            promptScrimTime(message, scrim);
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

const promptScrimTime = async (message: Message, scrim: Scrim) => {
    const scrimTimeEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`What is the scrim date and time?`)
        .setDescription(`Use the format '1 Jan 2021 20:00:00'.`)
        .setFooter(`Step 2/2`);

    (await message.reply(scrimTimeEmbed)).channel
        .awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: [`time`],
        })
        .then(async (scrimTimeMessage) => {
            try {
                const scrimTime = new Date(
                    scrimTimeMessage.first()?.content || ``,
                );

                const newScrim: Scrim = {
                    ...scrim,
                    _id: `${scrimTime.getTime()}${Date.now()}`,
                    startTime: scrimTime.getTime(),
                };

                new scrimDB(newScrim).save();

                const scrimSuccessEmbed = new MessageEmbed()
                    .setColor(`#0099ff`)
                    .setTitle(`Scrim created`)
                    .addField(
                        `${scrim.title}`,
                        new Date(scrimTime || ``).toUTCString(),
                    );

                message.reply(scrimSuccessEmbed);
            } catch (e) {
                message.reply(e);
            }
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};
