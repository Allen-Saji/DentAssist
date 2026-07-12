import {
  httpActionGeneric,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
  type DataModelFromSchemaDefinition,
  type MutationBuilder,
  type QueryBuilder,
} from "convex/server";
import schema from "./schema";

type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export const query: QueryBuilder<DataModel, "public"> = queryGeneric;
export const mutation: MutationBuilder<DataModel, "public"> = mutationGeneric;
export const internalMutation: MutationBuilder<DataModel, "internal"> =
  internalMutationGeneric;
export const httpAction = httpActionGeneric;
