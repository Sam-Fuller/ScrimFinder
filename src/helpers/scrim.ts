import { Application } from '../types/application';
import { Scrim } from '../types/scrim';
import { scrimDB } from '../database/database';

export const getScrims = async (): Promise<Scrim[]> => {
    let scrims: Scrim[] = await scrimDB.find({
        startTime: { $gt: Date.now() },
    });

    scrims = scrims.filter((scrim) => !scrim.application);

    return scrims;
};

export const getAllScrims = async (): Promise<Scrim[]> => {
    const scrims: Scrim[] = await scrimDB.find({
        startTime: { $gt: Date.now() },
    });

    return scrims;
};

export const getScrimById = async (id: string): Promise<Scrim | null> => {
    const scrim = await scrimDB.findById(id);

    return scrim;
};

export const updateScrimApplication = async (
    id: string,
    application: Application,
): Promise<Scrim | null> => {
    const scrim = await scrimDB.findByIdAndUpdate(id, {
        application: application,
    });

    return scrim;
};
