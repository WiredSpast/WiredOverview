export type FurniData = {
  roomitemtypes: { furnitype: FloorItem[] };
  wallitemtypes: { furnitype: WallItem[] };
}

export type WallItem = {
  id: number;
  classname: string;
  revision: number;
  category: string;
  name: string;
  description: string;
  adurl: string | null;
  offerid: number;
  buyout: boolean;
  rentofferid: number;
  rentbuyout: boolean;
  bc: boolean;
  excludeddynamic: boolean;
  specialtype: number;
  furniline: string;
  environment: string | null;
  rare: boolean;
}

export type FloorItem = WallItem & {
  defaultdir: number;
  xdim: number;
  ydim: number;
  partcolors: { color: string[] };
  customparams: string | null;
  canstandon: boolean;
  cansiton: boolean;
  canlayon: boolean;
}