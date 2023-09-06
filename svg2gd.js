const fs = require('fs')
const zlib = require('zlib')
const leveldata = require('./leveldata.json')
const settings = fs.readFileSync('./settings.txt', 'utf8').split("\n").filter(x => x.startsWith(">")).map(x => x.slice(2))

let [gdLevels, svgfile] = settings
gdLevels = gdLevels.replace("HOME", process.env.HOME || process.env.USERPROFILE).replace(/\\/g,"/").replace("\r", "")
svgfile = svgfile.replace("HOME", process.env.HOME || process.env.USERPROFILE).replace(/\\/g,"/").replace("\r", "")

console.log()   // Blank line for neatness

let missing = []


function rgb2hsv (val) {
    var computedH = 0;
    var computedS = 0;
    var computedV = 0;
    let [r, g, b] = val.split(",")
   
    if ( r==null || g==null || b==null ||
        isNaN(r) || isNaN(g)|| isNaN(b) ) {
      alert ('Please enter numeric RGB values!');
      return;
    }
    if (r<0 || g<0 || b<0 || r>255 || g>255 || b>255) {
      alert ('RGB values must be in the range 0 to 255.');
      return;
    }
    r=r/255; g=g/255; b=b/255;
    var minRGB = Math.min(r,Math.min(g,b));
    var maxRGB = Math.max(r,Math.max(g,b));
   
    // Black-gray-white
    if (minRGB == maxRGB) {
     computedV = minRGB;
     return `${0}a${0}a${computedV}a1a1`;//this was the fix 💀
    }
   
    // Colors other than black-gray-white:
    var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
    var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
    computedH = 60*(h - d/(maxRGB - minRGB));
    computedS = (maxRGB - minRGB)/maxRGB;
    computedV = maxRGB;
    return `${computedH}a${computedS}a${computedV}a1a1`
}

function xor(str, key) {
    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (i = 0; i < str.length; i++) res += String.fromCodePoint(str[i] ^ key);
    return res;
}

fs.readFile(svgfile, 'utf8', function(err, data) {

    if (err) return console.log("Error! svg file not found: " + svgfile + "\nMaybe double check that you entered the correct file path into settings.txt?\n")
    console.log("> Parsing svg...")

    let list = data.split("\n")
    .filter(x => x.match("circle")) //do i even need this?
    .map(x => 
        ({
        circle: "circle",
        id: x.slice(x.indexOf("id") + 4,x.indexOf("fill") - 2),
        x: x.slice(x.indexOf("cx") + 4,x.indexOf("cy") - 2),
        y: x.slice(x.indexOf("cy") + 4,x.indexOf("r=") - 2),
        r: x.slice(x.indexOf("r=") + 3,x.indexOf("id") - 2),
        c: x.slice(x.indexOf("fill=") + 10,x.indexOf("fill-") - 3)
    }))

    if (!list.length) return console.log(logError)

    let levelStr = ""
    let objects = 0

    //console.log(list)
    console.log("> Building level...")

    /*list.forEach(y => {
        let pos = [300,200]
        if (y.x) pos[0] += y.x * 1            // X Offset
        if (y.y) pos[1] += (y.y - 128) * -1             // Y Offset
        levelStr += `1,${725},2,${pos[0]},3,${pos[1]},57,1`
        //if (y.r) levelStr += `,6,${y.r}`    // Rotation
        if (y.flipX) levelStr += `,4,1`     // Flip X
        if (y.flipY) levelStr += `,5,1`     // Flip Y
        if (y.id) levelStr += `,25,${y.id-100}`   // Z Layer
        if (y.r) levelStr += `,32,${y.r/4}`   // Scale
        if (y.c) {                          // Color (HSV)
            if (!Array.isArray(y.c)) levelStr += `,21,10,23,10,41,1,43,${rgb2hsv(y.c)}`
            else levelStr += `,21,10,22,10,23,10,41,1,42,1,43,${rgb2hsv(y.c[0])},44,${rgb2hsv(y.c[1])}`
        }
        levelStr += ";"
        objects += 1
    })*/
    list.forEach(y => {
        let pos = [300,200]
        if (y.x) pos[0] += y.x * 1            // X Offset
        if (y.y) pos[1] += (y.y - 128) * -1             // Y Offset
        levelStr += `1,${725},2,${pos[0]},3,${pos[1]}` // ,57,1 is group ids
        //if (y.r) levelStr += `,6,${y.r}`    // Rotation
        if (y.flipX) levelStr += `,4,1`     // Flip X
        if (y.flipY) levelStr += `,5,1`     // Flip Y
        if (y.id) levelStr += `,25,${y.id - 500}`   // Z Layer //changed to be depented on size
        if (y.r) levelStr += `,32,${y.r/4}`   // Scale
        if (y.c) {                          // Color (HSV)
            if (!Array.isArray(y.c)) levelStr += `,21,10,23,10,41,1,43,${rgb2hsv(y.c)}`
            else levelStr += `,21,10,22,10,23,10,41,1,42,1,43,${rgb2hsv(y.c[0])},44,${rgb2hsv(y.c[1])}`
        }
        levelStr += ";"
        objects += 1
    })
    console.log(levelStr)

    fs.readFile(gdLevels, 'utf8', function(err, saveData) {

        if (err) return console.log("Error! Could not open or find GD save file: " + gdLevels + "\nMaybe double check that you entered the correct file path into settings.txt?\n")

        if (!saveData.startsWith('<?xml version="1.0"?>')) {
            console.log("> Decrypting GD save file...")
            saveData = xor(saveData, 11)
            saveData = Buffer.from(saveData, 'base64')
            try { saveData = zlib.unzipSync(saveData).toString() }
            catch(e) { return console.log("Error! GD save file seems to be corrupt!\nMaybe try saving a GD level in-game to refresh it?\n") }
        }
        
        console.log("> Importing to GD...")
        let name = svgfile
        .slice(svgfile.lastIndexOf("/") + 1, svgfile.indexOf(".svg"))
        .replace(".svg")
        let desc =`a`
        saveData = saveData.split("<k>_isArr</k><t />")
        saveData[1] = saveData[1].replace(/<k>k_(\d+)<\/k><d><k>kCEK<\/k>/g, function(n) { return "<k>k_" + (Number(n.slice(5).split("<")[0])+1) + "</k><d><k>kCEK</k>" })
        saveData = saveData[0] + "<k>_isArr</k><t />" + leveldata.ham + leveldata.bur + levelStr + leveldata.ger + saveData[1]
        saveData = saveData
        .replace("[[LEVELNAME]]", name).replace("[[LEVELDESC]]", desc)
        .replace("[[BGCOL]]", "")//1_255_2_0_3_0 is red bg, leave empty for basic bg color
        .replace("[[OBJECTS]]", objects)
        
        fs.writeFileSync(gdLevels, saveData, 'utf8')
        console.log(`Saved level with ${objects} objects!`);
        if (missing.length) console.log(`Could not add objects for: ${missing.sort().join(", ")}`)
        console.log()
    })
});