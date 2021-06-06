import { Application } from '../types/application';
import { Message, MessageEmbed, TextChannel } from 'discord.js';

import { connectDB } from '../database/database';
import { client } from '../app';
import { getScrims, updateScrimApplication } from './scrim';
import {
    ADD_EMOTE,
    NUMBERS,
    CONFIRM_EMOTE,
    DENY_EMOTE,
    BLOCK_EMOTE,
} from './emoji';
import { Scrim } from '../types/scrim';

export const sendStartMenu = async (message: Message): Promise<void> => {
    const teamEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Menu`)
        .setDescription(`React with ${ADD_EMOTE} to create a book scrim`);

    const menuMessage = await message.reply(teamEmbed);

    await menuMessage.react(ADD_EMOTE);

    menuMessage
        .awaitReactions(
            (reaction) => [ADD_EMOTE].includes(reaction.emoji.name),
            {
                max: 1,
                time: 60000,
                errors: [`time`],
            },
        )
        .then(async (reactions) => {
            const reaction = reactions.first();

            if (reaction?.emoji.name === ADD_EMOTE) {
                await startScrimBooking(message);
            }
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

export const startScrimBooking = async (message: Message) => {
    const scrims = await getScrims();
    if (scrims.length === 0) {
        const noScrimEmbed = new MessageEmbed()
            .setColor(`#0099ff`)
            .setTitle(`Sorry, we are not looking for a scrim at this time.`);

        message.reply(noScrimEmbed);
    } else {
        if (scrims.length > 9) scrims.length = 9;

        const now = Date.now();

        const application = {
            _id: message.author.id + now,
            userId: message.author.id,
            timeInitiated: now,
        };

        const scrimEmbed = new MessageEmbed()
            .setColor(`#0099ff`)
            .setTitle(`Which scrim would you like to book?`)
            .setFooter(`step 1/4`);

        scrims.forEach((scrim, index) => {
            scrimEmbed.addField(
                `${index + 1}.    ${scrim.title}`,
                new Date(scrim.startTime || ``).toUTCString(),
            );
        });

        const menuMessage = await message.reply(scrimEmbed);

        for (let i = 1; i <= scrims.length; i++) {
            await menuMessage.react(NUMBERS[i]);
        }

        menuMessage
            .awaitReactions(
                (reaction) => NUMBERS.includes(reaction.emoji.name),
                {
                    max: 1,
                    time: 60000,
                    errors: [`time`],
                },
            )
            .then(async (reactions) => {
                const reaction = reactions.first();

                if (reaction === undefined) {
                    return;
                }

                const number = NUMBERS.indexOf(reaction.emoji.name);

                const scrim = scrims[number - 1];

                const newApplication: Application = {
                    ...application,
                    scrim: scrim._id,
                };

                await promptTeamName(message, newApplication);
            })
            .catch(() => {
                message.reply(`Timed out`);
            });
    }
};

const promptTeamName = async (message: Message, application: Application) => {
    const teamEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`What is your team's name?`)
        .setFooter(`step 2/4`);

    await (
        await message.reply(teamEmbed)
    ).channel
        .awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: [`time`],
        })
        .then(async (teamNameMessage) => {
            const teamName = teamNameMessage.first()?.content;

            const newApplication: Application = {
                ...application,
                teamName: teamName,
            };

            await promptTeamSR(message, newApplication);
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

const promptTeamSR = async (message: Message, application: Application) => {
    const srEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`What is your team's average SR?`)
        .setFooter(`step 3/4`);

    (await message.reply(srEmbed)).channel
        .awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: [`time`],
        })
        .then(async (teamSrMessage) => {
            const averageSr = teamSrMessage.first()?.content;

            const newApplication: Application = {
                ...application,
                averageSr: averageSr,
            };

            await sentAwaitingConfirmation(message, newApplication);
            await sendConfirmationRequest(message, newApplication);
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

const sentAwaitingConfirmation = async (
    message: Message,
    application: Application,
) => {
    const awaitingEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(
            `Awaiting confirmation, we will get back to you as soon as possible`,
        )
        .setFooter(`step 4/4`);

    await message.reply(awaitingEmbed);
};

const sendConfirmationRequest = async (
    message: Message,
    application: Application,
) => {
    const teamContact = process.env.TEAM_CONTACT;

    const awaitingEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Scrim Request`)
        .setDescription(
            `${application.teamName} (${application.averageSr} sr) have requested a scrim`,
        );

    const channelId = process.env.APPLICATION_CHANNEL;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const tagMessage = await (<TextChannel>channel).send(`<@${teamContact}>`);
    const confirmationMessage = await (<TextChannel>channel).send(
        awaitingEmbed,
    );

    await confirmationMessage.react(CONFIRM_EMOTE);
    await confirmationMessage.react(DENY_EMOTE);

    confirmationMessage
        .awaitReactions(
            (reaction) =>
                [CONFIRM_EMOTE, DENY_EMOTE, BLOCK_EMOTE].includes(
                    reaction.emoji.name,
                ),
            {
                max: 1,
                time: 86400000,
                errors: [`time`],
            },
        )
        .then(async (reactions) => {
            await connectDB();

            const scrim = await updateScrimApplication(
                application.scrim || ``,
                application,
            );
            if (!scrim) return;

            const reaction = reactions.first();

            if (reaction?.emoji.name === CONFIRM_EMOTE) {
                await sendConfirmed(message, application, scrim);
            } else if (reaction?.emoji.name === DENY_EMOTE) {
                await sendDenied(message, application, scrim);
            } else if (reaction?.emoji.name === BLOCK_EMOTE) {
                await sendBlocked(message, application, scrim);
            }

            await tagMessage.delete();
            await confirmationMessage.delete();
        })
        .catch(() => {
            message.reply(`Timed out`);
        });
};

const sendConfirmed = async (
    message: Message,
    application: Application,
    scrim: Scrim,
) => {
    const teamName = process.env.TEAM_NAME;
    const teamSr = process.env.TEAM_SR;
    const teamContact = process.env.TEAM_CONTACT;

    const confirmedEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(
            `Scrim booked:    ${teamName}    v    ${application.teamName}`,
        )
        .addFields(
            {
                name: scrim.title,
                value: new Date(scrim.startTime || ``).toUTCString(),
            },
            {
                name: `${teamName} (${teamSr} sr)`,
                value: `contact: <@${teamContact}>`,
            },
            {
                name: `${application.teamName} (${application.averageSr} sr)`,
                value: `contact: <@${application.userId}>`,
            },
        );

    await message.reply(confirmedEmbed);

    const channelId = process.env.APPLICATION_CHANNEL;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    await (<TextChannel>channel).send(confirmedEmbed);
};

const sendDenied = async (
    message: Message,
    application: Application,
    scrim: Scrim,
) => {
    const deniedEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(
            `Sorry, we found another team for this scrim, we would love to scrim with you another time.`,
        )
        .addFields({
            name: scrim.title,
            value: new Date(scrim.startTime || ``).toUTCString(),
        });

    await message.reply(deniedEmbed);
};

const sendBlocked = async (
    message: Message,
    application: Application,
    scrim: Scrim,
) => {
    const deniedEmbed = new MessageEmbed()
        .setColor(`#0099ff`)
        .setTitle(`Your team has been blocked.`);

    await message.reply(deniedEmbed);
};
