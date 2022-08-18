const params = window.location.search
  .replace('?', '')
  .split('&')
  .map(p => p.split('='))
  .reduce((map, val) => map.set(val[0], val[1]), new Map());

let stackList;
let stackView;

window.onload = () => {
  stackList = document.getElementById('stackList');
  stackView = document.getElementById('stackView');
}

webSocket = new WebSocket(`ws://localhost:${ params.get('port') }`)

webSocket.onmessage = (e) => {
  let data = JSON.parse(e.data);
  switch (data.type) {
    case 'extensionInfo':
      onExtensionInfo(data);
      break;
    case 'addWired':
      onAddWired(data);
      break;
    case 'removeWired':
      onRemoveWired(data);
      break;
    case 'clear':
      onClear(data);
      break;
  }
}

function onExtensionInfo(data) {
  for (let title of document.getElementsByTagName('title')) {
    title.innerHTML = `${ data.extensionInfo.name } ${ data.extensionInfo.version }`;
  }
}

function onClear(data) {
  stackList.innerHTML = '';
  stackView.innerHTML = '';
}

function onAddWired(data) {
  let stacks = document.getElementsByClassName('stackIcon');
  let wireds = document.getElementsByClassName('wf');

  for (let wired of data.wireds) {
    for (let w of [...wireds].filter(w => parseInt(w.dataset.id) === wired.id)) {
      w.remove();
    }

    let wiredImg = document.createElement('img');
    wiredImg.classList.add('wf');
    wiredImg.dataset.id = wired.id;
    wiredImg.dataset.revision = wired.revision;
    wiredImg.dataset.classname = wired.classname;
    wiredImg.crossOrigin = 'anonymous';

    if (wired.classname !== 'unknown') {
      wiredImg.setAttribute('src', `https://images.habbo.com/dcr/hof_furni/${wired.revision}/${wired.classname}_icon.png`);
    } else {
      wiredImg.classList.add('unknown');
    }

    let stack = [...stacks].find(s => Number(s.dataset.x) === wired.x && Number(s.dataset.y) === wired.y);
    if (!stack) {
      stack = createStack(wired.x, wired.y);
    }

    stack.appendChild(wiredImg);
  }

  [...stacks].forEach(sortStack);
  removeEmptyStacks();
  sortStackList();
}

function onRemoveWired(data) {
  let wireds = document.getElementsByClassName('wf');

  for (let wired of [...wireds].filter(w => parseInt(w.dataset.id) === data.id)) {
    wired.remove();
  }

  removeEmptyStacks();
  sortStackList();
}

function removeEmptyStacks() {
  let stacks = document.getElementsByClassName('stackIcon');

  for (let stack of stacks) {
    if (stack.children.length === 0)
      stack.remove();
  }
}

function select(stack) {
  stackView.innerHTML = '';

  [...stackList.children].forEach(s => s.classList.remove('selected'));

  if (stack) {
    stack.classList.add('selected');

    [...stack.children].reverse().forEach(wired => {
      let clone = wired.cloneNode();
      stackView.appendChild(clone);
      clone.addEventListener('click', e => openWired(clone));
    });
  }
}

function openWired(wired) {
  [...document.getElementsByClassName('wf')].forEach(w => w.classList.remove('selected'));

  wired.classList.add('selected');

  webSocket.send(JSON.stringify({
    type: 'open',
    id: parseInt(wired.dataset.id)
  }));
}

function createStack(x, y) {
  let stack = document.createElement('div');
  stack.classList.add("stackIcon");
  stack.dataset.x = x;
  stack.dataset.y = y;
  stack.addEventListener('click', () => select(stack));

  stackList.append(stack);
  return stack;
}

function sortStack(stack) {
  [...stack.children]
    .sort((a, b) => {
      if (a.dataset.classname === b.dataset.classname)
        return a.dataset.id - b.dataset.id

      return a.dataset.classname.localeCompare(b.dataset.classname);
    })
    .forEach(wired => stack.appendChild(wired));

  if (stack.classList.contains('selected'))
    select(stack);
}

function sortStackList() {
  [...stackList.children]
    .sort((a, b) => {
      for (let i = 0; i < a.children.length && i < b.children.length; i++)
        if ([...b.children].reverse()[i].dataset.classname !== [...a.children].reverse()[i].dataset.classname)
          return [...b.children].reverse()[i].dataset.classname.localeCompare([...a.children].reverse()[i].dataset.classname);

      if (b.children.length - a.children.length !== 0)
        return b.children.length - a.children.length;

      return [...b.children][b.children.length-1].dataset.id - [...a.children][a.children.length-1].dataset.id;
    })
    .forEach(stack => stackList.appendChild(stack));
}


document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
}, false);


async function createImageBlob() {
  return new Promise((resolve, reject) => {
    if (getImageHeight() <= 0 ||getImageWidth() <= 0)
      reject(new Error('No wired loaded in'));

    const canvas = document.createElement('canvas');
    canvas.width = getImageWidth();
    canvas.height = getImageHeight();

    const ctx = canvas.getContext('2d');

    [...stackList.children].forEach((stack, col) => {
      [...stack.children].reverse().forEach((wired, row) => {
        ctx.drawImage(wired, 40 * col, 30 * row);
      });
    });

    canvas.toBlob((blob) => {
      blob === null ? reject(new Error('Error making image blob')) : resolve(blob);
    });
  });
}

function copyImageToClipboard(button) {
  createImageBlob().then(blob => {
    const item = new ClipboardItem({ "image/png": blob });
    window.navigator.clipboard.write([item]);

    button.innerHTML = 'Copied!';
    button.classList.add('success');

    setTimeout(() => {
      button.innerHTML = 'Copy image to clipboard';
      button.classList.remove('success');
    }, 2500);
  }).catch(e => {
    button.innerHTML = e.message;
    button.classList.add('error');

    setTimeout(() => {
      button.innerHTML = 'Copy image to clipboard';
      button.classList.remove('error');
    }, 2500);
  });
}

function getImageWidth() {
  return stackList.children.length * 40 - 10;
}

function getImageHeight() {
  return 30 * [...stackList.children].reduce((max, stack) => stack.children.length > max ? stack.children.length : max, 0);
}