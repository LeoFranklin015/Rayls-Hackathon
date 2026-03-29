import { fromHexString as b } from "@chainsafe/ssz";
import { INetworkParams } from "../types/index.js";

export const raylsTestnetNetworkConfig: INetworkParams = {
  CHAIN_ID: 7295799,
  ENTRY_POINT_CONTRACT: [b("0x7c15F90346FeaF7CF68b4199711532CF04976F0b")],
};
