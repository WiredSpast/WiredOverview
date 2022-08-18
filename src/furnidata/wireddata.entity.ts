export type WiredData = {
  revision: number;
  id: number;
  classname: string;
  name: string;
}

export type Wired = WiredData & {
  typeId: number;
  x: number;
  y: number;
  z: number;
}