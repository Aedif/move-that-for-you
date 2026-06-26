import { MODULE_ID } from './config.js';

/**
 * Region behavior to define movement/rotation allowed areas.
 */
export class RestrictBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
    static defineSchema() {
        return {
            fullFit: new foundry.data.fields.BooleanField({
                label: `${MODULE_ID}.regions.restrict.fullFit.label`,
                hint: `${MODULE_ID}.regions.restrict.fullFit.hint`,
                initial: false,
            }),
        };
    }
}
