import { readFile } from 'fs/promises';
import { ExtensionInfo } from "gnode-api/lib/extension/extensioninfo";
import WindowedExtension from "./window/windowedextension.js";
import { FurniData } from "@/furnidata/furnidata.entity";
import axios from 'axios';
import { Wired, WiredData } from "@/furnidata/wireddata.entity";
import { HDirection, HFloorItem, HMessage, HPacket } from "gnode-api";

const extensionInfo: ExtensionInfo = JSON.parse((await readFile(new URL('../package.json', import.meta.url))).toString());
extensionInfo.name = "Wired Overview";

let furniData: FurniData = {roomitemtypes: {furnitype: []}, wallitemtypes: {furnitype: []}};
const wiredData: Map<number, WiredData> = new Map();
const unknownWiredData: WiredData = {
  classname: "unknown",
  id: 0,
  name: "unknown",
  revision: 0
}

const ext = new WindowedExtension(extensionInfo,'--window-size=300,350');
ext.run();

ext.on('connect', (host, connectionPort, hotelVersion, clientIdentifier, clientType) => {
  switch(host) {
    case 'game-nl.habbo.com':
      fetchWiredData('www.habbo.nl');
      break;
    case 'game-br.habbo.com':
      fetchWiredData('www.habbo.com.br');
      break;
    case 'game-tr.habbo.com':
      fetchWiredData('www.habbo.com.tr');
      break;
    case 'game-de.habbo.com':
      fetchWiredData('www.habbo.de');
      break;
    case 'game-fr.habbo.com':
      fetchWiredData('www.habbo.fr');
      break;
    case 'game-fi.habbo.com':
      fetchWiredData('www.habbo.fi');
      break;
    case 'game-es.habbo.com':
      fetchWiredData('www.habbo.es');
      break;
    case 'game-it.habbo.com':
      fetchWiredData('www.habbo.it');
      break;
    case 'game-us.habbo.com':
      fetchWiredData('www.habbo.com');
      break;
    case 'game-s2.habbo.com':
      fetchWiredData('sandbox.habbo.com');
      break;
    default:
      furniData.roomitemtypes.furnitype = [];
      furniData.wallitemtypes.furnitype = [];
      wiredData.clear();
      break;
  }
});

function fetchWiredData(hotel: string) {
  axios.get<FurniData>(`https://${hotel}/gamedata/furnidata_json/1`)
    .then(res => res.data)
    .then(data => {
      furniData = data;
      furniData
        .roomitemtypes
        .furnitype
        .filter(f =>
            f.classname.startsWith('wf_act')
              || f.classname.startsWith('wf_trg')
              || f.classname.startsWith('wf_cnd')
              || f.classname.startsWith('wf_xtra')
              || f.classname.startsWith('wf_slc')
        )
        .forEach(wired => wiredData.set(wired.id, wired));
    });
}

function openWired(id: number) {
  ext.sendToServer(new HPacket(`{out:Open}{i:${id}}`));
}

ext.on('uiData', d => {
  let data = JSON.parse(d);

  switch (data.type) {
    case 'open':
      openWired(data.id);
  }
});

ext.on('uiOpened', () => {
  ext.sendToUI(JSON.stringify({
    type: 'extensionInfo',
    extensionInfo
  }));

  ext.sendToUI(JSON.stringify({
    type: 'addWired',
    wireds: [...wiredMap.values()]
  }));
});

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Objects', onObjects);
ext.interceptByNameOrHash(HDirection.TOCLIENT, 'ObjectAdd', onObjectAddOrUpdate);
ext.interceptByNameOrHash(HDirection.TOCLIENT, 'ObjectUpdate', onObjectAddOrUpdate);
ext.interceptByNameOrHash(HDirection.TOCLIENT, 'ObjectRemove', onObjectRemove);

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'OpenConnection', onOpenOrCloseConnection);
ext.interceptByNameOrHash(HDirection.TOCLIENT, 'CloseConnection', onOpenOrCloseConnection);

let wiredMap = new Map<number, Wired>();

function onObjects(hMessage: HMessage) {
  let floorItems: HFloorItem[] = HFloorItem.parse(hMessage.getPacket());
  if (wiredData !== null) {
    ext.sendToUI(JSON.stringify({
      type: 'clear'
    }));

    let wireds: Wired[] = floorItems
      .map(item => ({ item, data: wiredData.get(item.typeId)}))
      .filter(({ data })  => data !== undefined)
      .map(({data, item}) => itemToWired(item, data || unknownWiredData));

    wireds.forEach(wired => wiredMap.set(wired.id, wired));

    ext.sendToUI(JSON.stringify({
      type: 'addWired',
      wireds
    }));
  }

  for (let item of floorItems) {
    if (item.id === 28141124) {
      console.log(item.stuff);
    }
  }
}

function onObjectAddOrUpdate(hMessage: HMessage) {
  let item = new HFloorItem(hMessage.getPacket());

  let data = wiredData.get(item.typeId);

  if (data) {
    let wired: Wired = itemToWired(item, data);

    wiredMap.set(wired.id, wired);

    ext.sendToUI(JSON.stringify({
      type: 'addWired',
      wireds: [ wired ]
    }));
  }
}

function onObjectRemove(hMessage: HMessage) {
  let id = parseInt(hMessage.getPacket().readString());

  wiredMap.delete(id);

  ext.sendToUI(JSON.stringify({
    type: 'removeWired',
    id
  }));
}

function itemToWired(item: HFloorItem, data: WiredData): Wired {
  return {
    id: item.id,
    typeId: data.id || 0,
    revision: data.revision || 0,
    classname: data.classname || "unknown",
    name: data.name || "unknown",
    x: item.tile.x,
    y: item.tile.y,
    z: item.tile.z
  };
}

function onOpenOrCloseConnection(hMessage: HMessage) {
  wiredMap.clear();

  ext.sendToUI(JSON.stringify({
    type: 'clear'
  }));
}