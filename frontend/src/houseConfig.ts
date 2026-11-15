export const HOUSE_FEATURE_NAMES = ['area', 'bedrooms'];
export const HOUSE_TARGET_NAMES = ['price'];
export const HOUSE_TRAIN_ROWS = 1000;
export const HOUSE_VALIDATION_ROWS = 100;
export const HOUSE_TEST_ROWS = 100;
export const HOUSE_BATCH_SIZE = 100;
export const HOUSE_LEARNING_RATE = 0.05;
export const HOUSE_NEW_EXAMPLE = [180, 3];
export const HOUSE_DEFAULT_EPOCHS = 20;
export const HOUSE_CASE_EPOCHS = 10;

/** The only architecture the House case and the house setup teach. */
export const HOUSE_NETWORK_SHAPE = {
  inputs: 2,
  hidden: [3],
  outputs: 1,
};

export function isHouseShape(featureCount: number, outputCount: number) {
  return featureCount === HOUSE_NETWORK_SHAPE.inputs
    && outputCount === HOUSE_NETWORK_SHAPE.outputs;
}
