import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

export function run(input: RunInput): FunctionRunResult {
  const operations = [];

  // Group by product ID
  const productGroups = input.cart.lines.reduce((acc, line) => {
    const product = line.merchandise.__typename === "ProductVariant" && line.merchandise?.product;
    if (product && product.discountMetafield && product.quantityMetafield) {
      (acc[product.id] = acc[product.id] || []).push(line);
    }
    return acc;
  }, {});

  for (const productId in productGroups) {
    const lines = productGroups[productId];
    const product = lines[0].merchandise.product;
    const requiredQuantity = product.quantityMetafield.value;

    // Calculate total quantity
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    if (totalQuantity >= requiredQuantity) {
      // Eligible for merging
      const parentVariantId = lines[0].merchandise.id;

      operations.push({
        merge: {
          cartLines: lines.map(line => ({ cartLineId: line.id, quantity: line.quantity })),
          parentVariantId: parentVariantId,
          title: product.title,
          price: {
            percentageDecrease: {
              value: parseFloat(product.discountMetafield.value)
            }
          }
        }
      });
    }
  }

  return operations.length ? { operations } : NO_CHANGES;
}
