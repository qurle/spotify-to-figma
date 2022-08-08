// I really don't care about quality of the code, but you can fork it to make it better

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 250 })

const maxWidth = 5
const coverSize = 128
const sMargin = 8
const mMargin = 16
const lMargin = 32

const finishMsgs = ["Done!", "You got it!", "Your playlists, sir!", "My job here is done", "Gotcha!", "It wasn't hard", "Got it! What's next?"]

const light: Paint = { type: 'SOLID', color: { r: 0.988, g: 0.988, b: 0.988 } }
const light50: Paint = { type: 'SOLID', color: { r: 0.988, g: 0.988, b: 0.988 }, opacity: 0.5 }
const dark: Paint = { type: 'SOLID', color: { r: 0.192, g: 0.192, b: 0.192 } }
const defaultFont: FontName = { family: 'Inter', style: 'Regular' }
const interMedium: FontName = { family: 'Inter', style: 'Medium' }
const interBold: FontName = { family: 'Inter', style: 'Bold' }

let mainframe: FrameNode
let notification: NotificationHandler
let covers: Array<Cover> = []
let count: number

let working: boolean

interface Cover {
  array: Uint8Array,
  url: string,
  id: string,
}

interface Items {
  data: any
  type: ItemType
}

enum ItemType {
  PLAYLIST,
  ALBUM,
  TRACK,
  ARTIST,
  CATEGORY,
  EPISODE
}

enum Direction {
  TOP,
  RIGHT,
  BOTTOM,
  LEFT
}


figma.ui.onmessage = msg => {
  if (msg.type === 'insert') {
    c("Got insert message")
    parseItems(msg.jsonString)
  }

  if (msg.type === 'imgData') {
    notify("Drawing " + (count - covers.length + 1) + " out of " + count)
    drawCover(msg.cover)
    if (covers.length != 0) {
      const cover: Cover = covers.shift()
      figma.ui.postMessage({ type: 'coverInfo', cover })
    }
    else {
      finish()
    }
  }

  figma.on("currentpagechange", escape)
  figma.on("close", escape)

  async function parseItems(jsonString: string) {
    // Parsing JSON
    notify("Trying to deal with this JSON")
    let json, items: Items
    try { json = JSON.parse(jsonString) }
    catch {
      notify("Oh, that's not a JSON :(")
      return
    }
    // Playlists or albums?
    items = getItems(json)
    if (items == null) {
      notify("Looks like it's not array or playlists or albums")
      return
    }
    // Counting playlists
    count = items.data.length
    c("JSON parsed")

    // Creating Main Frame
    working = true
    mainframe = figma.createFrame()
    mainframe.locked = true
    mainframe.fills = [dark]
    mainframe.resizeWithoutConstraints(lMargin + Math.min(count, maxWidth) * (coverSize + lMargin), 200)
    mainframe.name = "Spotify Data"
    mainframe.x = Math.round(figma.viewport.center.x - mainframe.width / 2)
    mainframe.y = Math.round(figma.viewport.center.y - mainframe.height / 2)
    mainframe.cornerRadius = 4

    // Loading fonts
    await figma.loadFontAsync(defaultFont)
    await figma.loadFontAsync(interMedium)
    await figma.loadFontAsync(interBold)
    c("Fonts loaded")

    // Handling Message
    if (json.message) {
      const message = figma.createText()
      message.name = "Message"
      mainframe.appendChild(message)
      message.characters = json.message
      message.fontSize = 16
      message.fontName = interBold
      message.x = message.y = lMargin
      message.fills = [light]
    }

    showItems(items)
  }


  function showItems(items: Items) {
    // Dynamic position markers
    let x = lMargin
    let y = 2 * lMargin + mMargin
    let rowHeight = 0

    // For each item
    for (let i = 0; i < count; i++) {
      let array: Array<SceneNode> = []
      const item = items.data[i]

      // Creating cover base rectangles
      const cover = figma.createRectangle()
      cover.name = "Cover"
      cover.fills = []
      cover.strokes = [light50]
      cover.strokeWeight = 2
      cover.resize(coverSize, coverSize)
      cover.cornerRadius = 4
      const url = getCover(item, items.type)
      if (url) {
        const id = cover.id
        c("Got " + covers.push({ url, id, array: null }) + " covers")
      }
      array.push(cover)

      // Showing name
      const name = figma.createText()
      name.fontName = interMedium
      name.characters = item.name
      name.fontSize = 16
      name.resize(cover.width, 16)
      name.textAutoResize = "HEIGHT"
      name.textAlignHorizontal = "CENTER"
      name.fills = [light]
      name.y = itemArrayEdge(array).bottom + mMargin
      array.push(name)

      if (items.type === ItemType.TRACK) {
        c("Fetching artists from playlist")
        const artists = figma.createText()
        let artistsStr: string = ""
        for (let j = 0; j < item.album.artists.length; j++) {
          c("Name: " + item.artists[j].name)
          artistsStr += item.artists[j].name
          if (j < item.artists.length - 1) artistsStr += ", "
        }
        artists.characters = artistsStr
        artists.fontSize = 16
        artists.fontName = interMedium
        artists.resize(cover.width, 16)
        artists.textAutoResize = "HEIGHT"
        artists.textAlignHorizontal = "CENTER"
        artists.fills = [light50]
        artists.y = itemArrayEdge(array).bottom + sMargin
        array.push(artists)
      }

      // Showing artist (for albums)
      if (items.type === ItemType.ALBUM) {
        const artists = figma.createText()
        let artistsStr: string = ""
        for (let j = 0; j < item.artists.length; j++) {
          c("Name: " + item.artists[j].name)
          artistsStr += item.artists[j].name
          if (j < item.artists.length - 1) artistsStr += ", "
        }
        artists.characters = artistsStr
        artists.fontSize = 16
        artists.fontName = interMedium
        artists.resize(cover.width, 16)
        artists.textAutoResize = "HEIGHT"
        artists.textAlignHorizontal = "CENTER"
        artists.fills = [light50]
        artists.y = itemArrayEdge(array).bottom + sMargin
        array.push(artists)

      }

      // Showing URL (It's different for categories)
      const link = figma.createText()
      link.characters = "Link"
      const linkUrl = (items.type === ItemType.CATEGORY) ? item.href : item.external_urls.spotify
      link.setRangeHyperlink(0, link.characters.length, { type: 'URL', value: linkUrl })
      link.fontSize = 12
      link.fontName = interMedium
      link.opacity = 0.5
      link.resize(cover.width, 16)
      link.textAutoResize = "HEIGHT"
      link.textAlignHorizontal = "CENTER"
      link.fills = [light]
      link.y = itemArrayEdge(array).bottom + sMargin
      array.push(link)

      // Groupping
      const group = figma.group(array, mainframe)
      group.x = x
      group.y = y
      group.name = item.name
      if (group.height > rowHeight)
        rowHeight = group.height
      x += coverSize + lMargin

      if ((i + 1) % maxWidth === 0) {
        x = lMargin
        y += rowHeight + lMargin
        rowHeight = 0
      }
    }

    if ((count % maxWidth !== 0))
      y += rowHeight + lMargin
    mainframe.resizeWithoutConstraints(mainframe.width, y)
    mainframe.y = Math.round(figma.viewport.center.y - mainframe.height / 2)

    if (covers.length > 0) {
      const cover = covers.shift()
      figma.ui.postMessage({ type: 'coverInfo', cover })
    } else {
      notify("Found no covers in JSON")
      finish()
    }

  }

  function getCover(item, type: ItemType) {
    let coverHeight = 0
    let images
    if (type === ItemType.CATEGORY) {
      images = item.icons
      c("ddd")
    } else
      images = (type === ItemType.TRACK && item.album) ? item.album.images : item.images
    if (!images) return null

    let cover = images[0].url
    for (let image of images) {
      if (image.height > coverHeight) {
        coverHeight = image.height
        cover = image.url
      }
    }
    return cover
  }

  function itemArrayEdge(items: Array<SceneNode>) {
    if (items[0] == undefined)
      return null
    let top, right, bottom, left
    top = bottom = items[0].y
    right = left = items[0].x

    for (let item of items) {
      top = Math.min(top, item.y)
      bottom = Math.max(bottom, item.y + item.height)
      right = Math.max(right, item.x + item.width)
      left = Math.min(left, item.x)
    }

    return { top, right, bottom, left }
  }

  function drawCover(cover: Cover) {

    const id = cover.id
    const array = cover.array

    const coverRect = figma.getNodeById(id) as RectangleNode
    coverRect.fills = [{ type: 'IMAGE', imageHash: figma.createImage(array).hash, scaleMode: 'FILL' }]
    coverRect.strokes = []
  }

  function notify(text: string) {
    if (notification != null)
      notification.cancel()
    notification = figma.notify(text)
  }

  function escape() {
    notification.cancel()
    if (working) {
      notify("Plugin work have been interrupted")
      mainframe.locked = false
    }
  }

  function finish() {
    working = false
    notify(finishMsgs[Math.floor(Math.random() * finishMsgs.length)])
    const nodes: SceneNode[] = []
    nodes.push(mainframe)
    figma.currentPage.selection = nodes
    figma.viewport.scrollAndZoomIntoView(nodes)
    mainframe.locked = false

    figma.closePlugin()
  }

  function c(str: string) { console.log(str) }


  function getItems(json) {
    // if (we got smth in one of the cases) return {data: which is array, type: corresponding to the content }
    // Playlists
    if (json.playlists && json.playlists.length > 0) return { data: json.playlists, type: ItemType.PLAYLIST }
    if (json.playlists && json.playlists.items && json.playlists.items.length > 0) return { data: json.playlists.items, type: ItemType.PLAYLIST }  // ex. https://developer.spotify.com/console/get-featured-playlists/
    if (json.href && json.href.includes("playlists?")) return { data: json.items, type: ItemType.PLAYLIST }                         // ex. https://developer.spotify.com/console/get-playlists/

    // Albums
    if (json.albums && json.albums.length > 0) return { data: json.albums, type: ItemType.ALBUM }                                   // ex. https://developer.spotify.com/console/get-several-albums/
    if (json.albums && json.albums.items && json.albums.items.length > 0) return { data: json.albums.items, type: ItemType.ALBUM }  // ex. https://developer.spotify.com/console/get-new-releases/
    if (json.href && json.href.includes("albums?") && json.items && json.items[0].hasOwnProperty("album")) {                        // ex. https://developer.spotify.com/console/get-current-user-saved-albums/
      let items = []
      for (let item of json.items) items.push(item.album)
      return { data: items, type: ItemType.ALBUM }
    }
    if (json.href && json.href.includes("albums?")) return { data: json.items, type: ItemType.ALBUM }                               // ex. https://developer.spotify.com/console/get-artist-albums/

    // Tracks    
    if (json.tracks && json.tracks.length > 0) return { data: json.tracks, type: ItemType.TRACK }                                   // ex. https://developer.spotify.com/console/get-recommendations/
    if (json.href && (json.href.includes("tracks?") || json.href.includes("recently-played")) && json.items && json.items[0].hasOwnProperty("track")) {        // ex. https://developer.spotify.com/console/get-current-user-saved-tracks/
      let items = []
      for (let item of json.items) items.push(item.track)
      return { data: items, type: ItemType.TRACK }
    }
    if (json.tracks && json.tracks.href && json.tracks.href.includes("tracks?") && json.tracks.items && json.tracks.items[0].hasOwnProperty("track")) {        // ex. https://developer.spotify.com/console/get-playlist/
      let items = []
      for (let item of json.tracks.items) items.push(item.track)
      return { data: items, type: ItemType.TRACK }
    }
    if (json.href && json.href.includes("tracks?")) return { data: json.items, type: ItemType.TRACK }                             // ex. https://developer.spotify.com/console/get-album-tracks/

    //Artists
    if (json.artists && json.artists.length > 0) return { data: json.artists, type: ItemType.ARTIST }                             // ex. https://developer.spotify.com/console/get-several-artists/
    if (json.href && json.href.includes("artists?")) return { data: json.items, type: ItemType.ARTIST }                           // ex. https://developer.spotify.com/console/get-current-user-top-artists-and-tracks?type=artists

    //Categories
    if (json.categories && json.categories.items && json.categories.items.length > 0) return { data: json.categories.items, type: ItemType.CATEGORY }         // ex. https://developer.spotify.com/console/get-browse-categories/

    // Nothing
    return null
  }
}
