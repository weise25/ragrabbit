"use client";

import { Indexed } from "@repo/db/schema";
import { createCRUDProvider } from "@repo/design/components/crud-provider/crud-provider";
import { getAllIndexes } from "../actions";

export const { CRUDProvider, useIndexes } = createCRUDProvider<Indexed>({ refreshAction: getAllIndexes });
