//script for graphics

//note all scale params in draw functions do not work, fix or delete

//defining string rgb values by hashing them
Object.defineProperty(String.prototype, 'rgb', {
  //hashing string
  value: function() {
    var hash = 0, i, chr;
    for (var i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash = (chr << (6 * i)) + hash;
      hash |= 0; // Convert to 32bit integer
    }
    //changing hash into rgb format:
    if (hash < 0) {
      hash *= -1;
    }
    if (hash < 65280) {
      hash++;
      hash *= 17777777;
    }
    //16777215 is FFFFFF in base 16
    hash = hash % 16777215;
    color = Math.floor(hash);
    color = color.toString(16);
    var rgb = [];
    for (var i = 0; i < 3; i++) {
      rgb.push(parseInt(color.slice(i, 2 + i), 16));
    }
    //correcting colors too dark
    if (rgb.reduce((a, b) => a + b, 0) < 600) {
      //remainder of 255 and highest rbg chanel
      const buff = 255 - Math.max(rgb[0], rgb[1], rgb[2]);
      //add buff
      for (var i = 0; i < 3; i++) {
        rgb[i] = rgb[i] + buff;
      }
      //find min chanel
      let min = 0;
      for (var i = 1; i < 3; i++) {
        if (rgb[i] < rgb[min]) {
          min = i;
        }
      }
      //equalize far apart channels
      let diff = Math.max(rgb[0], rgb[1], rgb[2]) - rgb[min];
      if (diff > 100) {
        rgb[min] += diff - 50;
      }
      //construct rbg string
      color = '';
      for (var i = 0; i < 3; i++) {
        color += rgb[i].toString(16);
      }
    }
    return (color);
  }
});

//splits string at target character;
function splitString(string, target) {
  list = [];
  lastTagert = 0;
  for (var i = 0; i < string.length; i++) {
    if (string[i] == target) {
      list.push(string.slice(lastTagert, i));
      lastTagert = i + 1;
    }
  }
  list.push(string.slice(lastTagert, string.length));
  return(list);
}


//simple class to hold data from molecule's sites
class Site {
  constructor(name, states, color = null) {
    this.bondName = null;
    //get bond name from states
    for (var i = 0; i < states.length; i++) {
      if (states[i].includes('!')) {
        var pair = splitString(states[i], '!');
        states[i] = pair[0];
        this.bondName = parseInt(pair[1]);
      }
    }
    //get bond name from site name
    if (name.includes('!')) {
      var pair = splitString(name, '!');
      name = pair[0];
      this.bondName = parseInt(pair[1]);
    }
    //init vars
    this.name = name;
    this.states = states; //list of state names
    this.position = null; //x y coords of where to draw bond
    //color from name
    if (color == null) {
      this.color = this.name.rgb();
    } else {
      this.color = color;
    }
  }
}


//class for molecules
class Molecule {
  constructor(def, mode = 'normal') {
    //draw compact / normal
    this.mode = mode;
    //bionetgen definition
    this.def = def;
    //6 digit rgb hex
    this.color = '';
    //name of molecule
    this.name = '';
    //this.sites is an object, keys: site names, values: list of state names
    //this.sites, list of Site() instances
    this.process();
    //colors used to draw states
    this.stateColors = ['#FBC6D0', '#00FDFF', '#FA26A0', '#99F3BD'];
    //object, keys: bond names, values: x,y pair of pt to draw bond
    this.bonds = new Object();
  }

  //initialize this.color, sites, name from bionetgen def
  process() {
    //notice bond info is kept in this.sites and removed later
    var temp = splitString(this.def, '(');
    this.name = temp[0];
    this.color = this.name.rgb();
    var sites = temp[1].slice(0, -1);
    //sites = sites.slice(sites.length - 2);
    sites = splitString(sites, ',');
    var siteList = [];
    var temp = '';
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].includes(')')) {
        sites[i] = sites[i].replace(')', '');
      }
      if (sites[i].includes('~')) {
        //if sites have states
        temp = splitString(sites[i], '~');
        var states = temp.slice(1);
        if (this.mode == 'normal') {
          siteList.push(new Site(temp[0], states));
        } else {
          //if compact mode slice to only first letter
          for (let u = 0; u < states.length; u++) {
            let state = states[u];
            //if state has bond
            if (state.includes('!')) {
              let temp = states[u].split('!');
              let stateName = temp[0];
              let bond = temp[1];
              stateName = stateName.slice(0, 1);
              states[u] = stateName + '!' + bond;
            }
            else {
              states[u] = state.slice(0, 1);
            }
          }
          let originalName = temp[0];
          siteList.push(new Site(
            originalName.slice(0, 1),
            states,
            originalName.rgb())
          );
        }
        //if there are sites but no states
      } else if (sites[i].length != 0) {
        //compact vs normal
        if (this.mode == 'normal') {
          siteList.push(new Site(sites[i], []));
        } else {
          //if site has bond
          let site = sites[i];
          let originalName = sites[i];
          if (site.includes('!')) {
            let temp = site.split('!');
            let siteName = temp[0];
            let bond = temp[1];
            siteName = siteName.slice(0, 1);
            sites[i] = siteName + '!' + bond;
            siteList.push(new Site(sites[i], [], originalName.rgb()));
          } else {
            siteList.push(new Site(site.slice(0, 1), [], originalName.rgb()));
          }
        }
      } else {
        //if there are no sites
        siteList = null;
      }
    }
    if (siteList == null) {
      this.sites = [];
    } else {
      this.sites = siteList;
    }
  }

  //draw rounded rect
  drawRoundRect(canvas, x, y, radius, length, rgb) {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + rgb;
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, Math.PI / 2, Math.PI * (3/2));
    ctx.arc(
      x + radius + length,
      y + radius, radius,
      Math.PI * (3/2),
      Math.PI / 2
    );
    ctx.lineTo(x + radius, y + 2 * radius);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.stroke();
    ctx.closePath();
  }

  //draw bionetgen sites with states labeled
  drawSitesComplex(canvas, x, y, radius, scale = 1, initX = 0) {
    var ctx = canvas.getContext('2d');
    const siteRadius = 8;
    var siteLength = 0;
    var stateLength = 0;
    var longestState = 0;
    var tallestState = 0;
    var hasStates = false;
    //adding sites
    var dx = radius - 2 * siteRadius;
    for (var i = 0; i < this.sites.length; i++) {
      //bottom line of sites
      var dy = 2 * radius + 2;
      dx = dx + 2 * siteRadius + siteLength;
      if (longestState > 2 * siteRadius + siteLength) {
        dx = dx - siteLength + longestState - 2 * siteRadius;
      }
      //drawing sites
      siteLength = 4.9 * this.sites[i].name.length;
      this.drawRoundRect(
        canvas, x + dx - radius / 2,
        y + dy - radius / 2,
        siteRadius,
        siteLength,
        this.sites[i].color
      );
      //drawing site names
      ctx.fillStyle = '#000000';
      ctx.font = "12px Arial";
      ctx.fillText(
        this.sites[i].name,
        x + dx - siteRadius / 2,
        y + dy + siteRadius / 2 + 1
      );
      //drawing states of sites
      var states = this.sites[i].states;
      if (states.length == 0) {
        longestState = 0;
      } else if (!hasStates) {
        hasStates = true;
      }
      //add bonds to stateless sites
      if (this.sites[i].bondName != null) {
        if (this.sites[i].states.length == 0) {
          this.sites[i].position = [x + dx - initX, y + dy + siteRadius];
        }
      }
      for (var u = 0; u < states.length; u++) {
        var sx = x + dx - siteRadius + 2;
        var sy = y + dy + u * 13 + siteRadius;
        //fix lengths
        stateLength = this.sites[i].states[u].length * 9;
        if (this.sites[i].states[u].length <= 10) {
          stateLength += 3;
        }
        if (longestState < stateLength) {longestState = stateLength;}
        //add bonds to sites with states
        if (this.sites[i].bondName != null) {
          this.sites[i].position = [sx + stateLength / 2 - initX, sy + 13];
        }
        //draw states
        var colorIndex = u;
        if (colorIndex > 3) {colorIndex = colorIndex % 3;}
        ctx.fillStyle = this.stateColors[colorIndex];
        ctx.beginPath();
        ctx.rect(sx, sy, stateLength, 13);
        if (sy + 13 > tallestState) {
          tallestState = sy + 13;
        }
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.stroke();
        ctx.closePath();
        //naming states
        ctx.fillStyle = '#000000';
        ctx.fillText(this.sites[i].states[u], sx + 1.5, sy + 10.5);
      }
    }
    //return total [length, height] to compare to default dimensions
    var dims = [];
    //use either end of site, state, or molecule for x component
    var possibleLengths = [
      x + dx - radius / 2 + siteLength, dx,
      sx + stateLength
    ];
    for (var i = 0; i < 3; i++) {
      if (isNaN(possibleLengths[i])) {
        possibleLengths[i] = 0;
      }
    }
    dims.push(possibleLengths.reduce(function (a, b) {
      return (Math.max(a, b));
    }));
    if (hasStates) {
      dims.push(tallestState);
    } else {
      dims.push(radius * 2 + siteRadius + 2);
    }
    return (dims);
  }

  //draw molecule with states and sites labled
  drawComplex(canvas, x, y, scale = 1, initX = 0) {
    var ctx = canvas.getContext('2d');
    const radius = 15;
    ctx.font = "15px Arial";
    var length = ctx.measureText(this.name).width;
    if (length < 0) {length *= -1;}
    //notice drawSitesComplex() is called twice
    //this is a bad implementation but it doesn't effect runtime noticably
    var dims = this.drawSitesComplex(canvas, x, y, radius, 1, initX);
    let numSites = Object.keys(this.sites).length;
    if ((length < dims[0]) && numSites > 0) {
      length = dims[0] - x;
    }
    //drawing pill shape
    this.drawRoundRect(canvas, x, y, radius, length, this.color);
    //drawing sites
    this.drawSitesComplex(canvas, x, y, radius, 1, initX);
    //drawing name
    ctx.fillStyle = '#000000';
    ctx.font = "15px Arial";
    ctx.fillText(this.name, x + radius / 2, y + radius + 5);
    //return [length, height] of molecule for Graphic class
    return ([radius * 2 + length, dims[1]]);
  }
}


//each bionetgen should have own Graphic instance
class Graphic {
  constructor(def, mode = 'normal') {
    //draw normal / compact
    this.mode = mode;
    //bionetgen definition
    this.def = def;
    //compartment
    this.comp = 'placeholder';
    //list of instances of molecule classes
    this.molecules = [];
    //initializing this.molecules
    this.process();
  }

  process() {
    var defs = splitString(this.def, '.');
    if (this.mode == 'normal') {
      for (var i = 0; i < defs.length; i++) {
        this.molecules.push(new Molecule(defs[i]));
      }
    } else {
      for (var i = 0; i < defs.length; i++) {
        this.molecules.push(new Molecule(defs[i], 'compact'));
      }
    }
  }

  //unfinished
  drawMembrane(canvas) {
    //init context
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.font = "10px Arial";
    //box dims
    let textWidth = ctx.measureText(this.comp).width;
    let height = 60;

    //draw membrane at top right corner, filling canvas
    ctx.beginPath();
    ctx.moveTo(0, 0);
    //left line
    ctx.lineTo(0, height);
    //bottom line
    ctx.lineTo(textWidth, height);
    //right line
    ctx.lineTo(textWidth, 0);
    //top line
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.closePath();
  }

  //only works for species with two molecules or less, fix this
  draw(canvas, initX, initY, scale = 1) {
    let length = 0;
    let height = 0;
    let names = new Set();
    let pairs = [];//list of pairs of xy coords for each bond
    //drawing the graphics on the canvas
    if (canvas.getContext) {
      let ctx = canvas.getContext('2d');
      //extracting bonds
      for (let i = 0; i < this.molecules.length; i++) {
        let thisX = scale * (2 + length + initX);
        let thisY = scale * (2 + initY);
        let dims = this.molecules[i].drawComplex(canvas, thisX, thisY, scale, initX);
        length += dims[0];
        if (dims[1] > height) {
          height = dims[1];
        }
      }
      //each molecule
      for (let i = 0; i < this.molecules.length; i++) {
        //each site
        for (let y = 0; y < this.molecules[i].sites.length; y++) {
          let m1 = this.molecules[i].sites[y];
          //if unique bond m1 exists
          if (m1.bondName != null && !names.has(m1.bondName)) {
            names.add(m1.bondName);
            let newPair = [m1.position];
            //check all sites in species for matching bond type
            for (let u = 0; u < this.molecules.length; u++) {
              for (let z = 0; z < this.molecules[u].sites.length; z++) {
                //ensure a molecule doesnt bond to itself
                if (z != y || u != i) {
                  let m2 = this.molecules[u].sites[z];
                  if (m2.bondName == m1.bondName) {
                    newPair.push(m2.position);
                    newPair.push(m2.bondName);
                    pairs.push(newPair);
                  }
                }
              }
            }
          }
        }
      }
      //drawing bonds
      ctx.fillStyle = '#000000';
      ctx.font = "10px Arial";
      var maxHeight = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i][0][1] > maxHeight) {
          maxHeight = pairs[i][0][1];
        }
        if (pairs[i][1][1] > maxHeight) {
          maxHeight = pairs[i][1][1];
        }
        ctx.beginPath();
        ctx.moveTo(scale * pairs[i][0][0] + initX, scale * pairs[i][0][1] + initY);
        //functioning code for bond labels below, omitted for style
        //ctx.fillText(pairs[i][2], pairs[i][0][0] - 7 + initX, pairs[i][0][1] + 8.5 + initY);
        ctx.lineTo(scale * pairs[i][0][0] + initX, scale * (pairs[i][0][1] + 5 * i + 5) + initY);
        ctx.lineTo(scale * pairs[i][1][0] + initX, scale * (pairs[i][0][1] + 5 * i + 5) + initY);
        ctx.lineTo(scale * pairs[i][1][0] + initX, scale * pairs[i][1][1] + initY);
        ctx.stroke();
      }
    } else {/*canvas-unsupported code here*/}
    if (maxHeight + 10 > height + 5) {
      return ([length + 5, maxHeight + 10]);
    } else {
      return ([length + 5, height + 5]);
    }
  }
}

//drawing graphics in html
function drawGraphics(tableID, BngColumn, CanvasColumn, drawType) {
    //get table html elements
    var speciesTable = document.getElementById(tableID);
    const rowsLen = speciesTable.rows.length;

    //loop over each canvas
    for (y = 1; y < rowsLen; y++) {
        //get canvas and bionetgen html elements
        var canvasElm = speciesTable.rows.item(y).cells.item(CanvasColumn).children[0];
        var canvasHTML = canvasElm.innerHTML;
        const canvasID = canvasElm.id;
        var bioNetGen = speciesTable.rows.item(y).cells.item(BngColumn).innerHTML;

        //remove bng trailing syntax leftover from mustache templating
        bioNetGen = bioNetGen.replace(/,\)/g, ')');
        bioNetGen = bioNetGen.replace(/-\)/g, ')');
        bioNetGen = bioNetGen.replace(/!\)/g, ')');
        if (bioNetGen[bioNetGen.length - 1] == '.') {
          bioNetGen = bioNetGen.slice(0, bioNetGen.length - 1);
        }
        speciesTable.rows.item(y).cells.item(BngColumn).innerHTML = bioNetGen;

        //get canvas dimensions based on draw type
        if (drawType == 'g') {
            var drawObj = new Graphic(bioNetGen);
            dims = drawObj.draw(canvasElm, 0.5, 0.5);

            //resize canvas
            canvasElm.width = dims[0];
            canvasElm.height = dims[1];

            //draw graphic
            drawObj.draw(canvasElm, 0.5, 0.5);
        } else if (drawType == 'm') {
            var drawObj = new Molecule(bioNetGen);
            dims = drawObj.drawComplex(canvasElm, 0.5, 0.5);

            //resize canvas
            canvasElm.width = dims[0] + 5;
            canvasElm.height = dims[1] + 5;

            //draw graphic
            drawObj.drawComplex(canvasElm, 0.5, 0.5);
        } else {
            throw 'drawType ' + drawType + ' is not valid, use only m or g';
        }
    }
}
