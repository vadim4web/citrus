<template>
  <div class="p-6">
    <h1 class="cssscope text-2xl font-bold mb-4 py-3 leading-9">
      🍊<strong>Citrus <span class="analyze">(C3S)</span> Analyzer</strong> | <i>CSS S</i>cope <em class="analyze">Analyzer</em>
    </h1>

    <div class="mb-10 mode">
      <label
        class="relative pl-5 py-1 after:absolute after:content-['simple'] after:bottom-[calc(0.5ch-100%)] after:left-5 after:italic before:rounded-r-[0]"
      >Website URL <input type="radio" value="url" v-model="mode" />
      <span class="absolute"></span>
      </label>
      <label
        class="relative pr-5 py-1 after:absolute after:content-['advanced'] after:bottom-[calc(0.5ch-100%)] after:right-5 after:italic"
      ><input type="radio" value="github" v-model="mode" class="rounded-none!" /> GitHub user/org
      <span class="absolute"></span>
      </label>
    </div>

    <div class="space-y-2 mb-4">
      <div class="grid grid-cols-2 gap-1 w-full" id="mode">
        <label v-show="mode === 'github'" class="col-span-1">
          Username (or org):
          <input v-model="username" class="border rounded p-1 w-full"/>
        </label>

        <label v-show="mode === 'github'" class="col-span-1">
          Repo (optional):
          <input v-model="repo" class="border rounded p-1 w-full"/>
        </label>

        <label v-show="mode === 'url'" class="col-span-2">
          Static Site URL:
          <input v-model="url" type="text" class="border rounded p-1 w-full"/>
        </label>
      </div>

      <label class="inline-flex gap-1 min-w-[75%]">
        <b>
          TOP 
          <span class="analyze">({{ topN }})</span>
        </b>
        <input type="range" min="1" max="10" step="3" v-model="topN" class="border rounded bg-gray-500 w-[75%]" />

        <span>
          CSS props
        </span>
      </label>

      <button @click="analyze" class="px-3 py-1 rounded mt-2 bg-indigo-600 text-white">Analyze IT!</button>
    </div>


    <div class="mt-4 p-2 border rounded bg-gray-500 relative overflow-hidden">
      <div v-if="loading" class="bg-gray-500 absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
        <span>Analyzing... {{ currentStatus }}</span>
        <span class="text-sm mt-1">(elapsed: {{ elapsed }}s)</span>
      </div>

      <p><strong>Summary:</strong></p>
      <ul>
        <li>Time taken: {{ summary?.time.toFixed(2) | 0 }}s</li>
        <li>Repositories analyzed: {{ summary?.repos | 0 }}</li>
        <li>CSS files analyzed: {{ summary?.files | 0 }}</li>
        <li>Distinct CSS properties found: {{ summary?.properties | 0 }}</li>
        <li>Total CSS size: {{ (summary?.bytes/1024).toFixed(2) | 0 }} KB</li>
      </ul>
    </div>

    <div class="mt-6">
      <h2 class="text-xl font-semibold mb-2">Top {{ topN }} CSS Properties</h2>
      <table class="border-collapse border border-gray-300 w-full">
        <thead>
          <tr class="bg-gray-500">
            <th class="border border-gray-300 px-2 py-1">Property</th>
            <th class="border border-gray-300 px-2 py-1">Count</th>
          </tr>
        </thead>
        <tbody v-if="results.length">
          <tr v-for="(item,i) in results" :key="i">
            <td class="border border-gray-300 px-2 py-1">{{ item[0] }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ item[1] }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="i in +topN" :key="i">
            <td class="border border-gray-300 px-2 py-1 relative after:absolute after:content-['-'] after:right-0">{{ i }}</td>
            <td class="border border-gray-300 px-2 py-1 relative before:absolute before:content-['-'] before:left-0">null</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

// -------------------------
// Reactive state
// -------------------------
const mode = ref('url')
const url = ref('')
const username = ref('')
const repo = ref('')
const topN = ref(4)
const results = ref([])
const loading = ref(false)
const localToken = ref(import.meta.env.VITE_GITHUB_TOKEN || '')
const summary = ref(null)
const currentStatus = ref("")
const elapsed = ref(0)     // ⏱ elapsed timer
let timerId = null
let allResults = []  // Global RAM storage

const corsProxy = "https://api.allorigins.win/raw?url="
const token = () => localToken.value || ''

// Start/stop elapsed timer
function startTimer() {
  elapsed.value = 0
  timerId = setInterval(() => { elapsed.value++ }, 1000)
}
function stopTimer() {
  clearInterval(timerId)
  timerId = null
}

// -------------------------
// Standard CSS properties
// -------------------------
const standardProps = new Set([
  // Alignment & Flex/Grid
  "align-content","align-items","align-self","justify-content","justify-items","justify-self",
  "place-content","place-items","place-self","flex","flex-basis","flex-direction","flex-flow",
  "flex-grow","flex-shrink","flex-wrap","order","gap","row-gap","column-gap",

  // Animation & Transition
  "all","animation","animation-delay","animation-direction","animation-duration","animation-fill-mode",
  "animation-iteration-count","animation-name","animation-play-state","animation-timing-function",
  "transition","transition-delay","transition-duration","transition-property","transition-timing-function",

  // Background
  "background","background-attachment","background-blend-mode","background-clip","background-color",
  "background-image","background-origin","background-position","background-repeat","background-size",

  // Border
  "border","border-block","border-block-color","border-block-end","border-block-end-color",
  "border-block-end-style","border-block-end-width","border-block-start","border-block-start-color",
  "border-block-start-style","border-block-start-width","border-block-style","border-block-width",
  "border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius",
  "border-bottom-style","border-bottom-width","border-collapse","border-color","border-image",
  "border-image-outset","border-image-repeat","border-image-slice","border-image-source",
  "border-image-width","border-inline","border-inline-color","border-inline-end",
  "border-inline-end-color","border-inline-end-style","border-inline-end-width","border-inline-start",
  "border-inline-start-color","border-inline-start-style","border-inline-start-width",
  "border-inline-style","border-inline-width","border-left","border-left-color","border-left-style",
  "border-left-width","border-radius","border-right","border-right-color","border-right-style",
  "border-right-width","border-spacing","border-style","border-top","border-top-color",
  "border-top-left-radius","border-top-right-radius","border-top-style","border-top-width",
  "border-width",

  // Box
  "box-decoration-break","box-shadow","box-sizing","contain","contain-intrinsic-size",
  "content-visibility","overflow-clip-margin","clip-path","mask","mask-border","mask-border-mode",
  "mask-border-outset","mask-border-repeat","mask-border-slice","mask-border-source","mask-border-width",
  "mask-clip","mask-composite","mask-image","mask-mode","mask-origin","mask-position","mask-repeat",
  "mask-size","mask-type","mix-blend-mode","will-change",

  // Color & Effects
  "color","color-adjust","forced-color-adjust","print-color-adjust","opacity","filter","backdrop-filter",
  "accent-color","caret-color","scrollbar-color","scrollbar-width","scrollbar-gutter","color-scheme",

  // Columns
  "columns","column-count","column-fill","column-gap","column-rule","column-rule-color",
  "column-rule-style","column-rule-width","column-span","column-width",

  // Compositing & Clip
  "isolation","clip","clip-path",

  // Counter
  "counter-increment","counter-reset","counter-set","content",

  // Display
  "display","visibility","overflow","overflow-x","overflow-y","overflow-clip-box","overflow-anchor",
  "overscroll-behavior","overscroll-behavior-x","overscroll-behavior-y","overscroll-behavior-inline",
  "overscroll-behavior-block","scroll-behavior","scroll-margin","scroll-margin-block",
  "scroll-margin-block-start","scroll-margin-block-end","scroll-margin-bottom","scroll-margin-inline",
  "scroll-margin-inline-start","scroll-margin-inline-end","scroll-margin-left","scroll-margin-right",
  "scroll-margin-top","scroll-padding","scroll-padding-block","scroll-padding-block-start",
  "scroll-padding-block-end","scroll-padding-bottom","scroll-padding-inline",
  "scroll-padding-inline-start","scroll-padding-inline-end","scroll-padding-left",
  "scroll-padding-right","scroll-padding-top","scroll-snap-align","scroll-snap-stop","scroll-snap-type",

  // Font & Text
  "font","font-family","font-feature-settings","font-kerning","font-language-override",
  "font-optical-sizing","font-palette","font-size","font-size-adjust","font-stretch","font-style",
  "font-synthesis","font-variant","font-variant-alternates","font-variant-caps",
  "font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position",
  "font-variation-settings","font-weight","line-height","line-clamp","letter-spacing","word-spacing",
  "word-break","word-wrap","white-space","overflow-wrap","tab-size","hyphens","text-align",
  "text-align-last","text-combine-upright","text-decoration","text-decoration-color",
  "text-decoration-line","text-decoration-style","text-decoration-thickness","text-emphasis",
  "text-emphasis-color","text-emphasis-position","text-emphasis-style","text-indent","text-justify",
  "text-orientation","text-overflow","text-rendering","text-shadow","text-size-adjust","text-transform",
  "text-underline-offset","text-underline-position","unicode-bidi","direction","writing-mode",

  // Grid
  "grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-rows","grid-column","grid-column-end",
  "grid-column-gap","grid-column-start","grid-gap","grid-row","grid-row-end","grid-row-gap","grid-row-start",
  "grid-template","grid-template-areas","grid-template-columns","grid-template-rows","subgrid",

  // Positioning
  "position","inset","inset-block","inset-block-end","inset-block-start","inset-inline","inset-inline-end",
  "inset-inline-start","top","right","bottom","left","z-index","float","clear","object-fit","object-position",

  // Layout
  "min-width","max-width","width","min-height","max-height","height","aspect-ratio","shape-outside",
  "shape-margin","shape-image-threshold","contain","contain-intrinsic-block-size","contain-intrinsic-height",
  "contain-intrinsic-inline-size","contain-intrinsic-width","resize",

  // Tables
  "caption-side","empty-cells","table-layout","border-collapse",

  // Scrollbars & UI
  "appearance","pointer-events","cursor","user-select","touch-action","caret-shape",
  "ime-mode","nav-down","nav-left","nav-right","nav-up",

  // Motion & 3D
  "perspective","perspective-origin","transform","transform-box","transform-origin","transform-style",
  "rotate","scale","translate","offset","offset-anchor","offset-distance","offset-path","offset-rotate",
  "motion-path","scroll-timeline","animation-timeline","view-timeline","contain-intrinsic-size",

  // Speech / Aural
  "speak","speak-as","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate",
  "voice-stress","voice-volume","rest","rest-before","rest-after","cue","cue-before","cue-after","play-during",

  // Misc
  "orphans","widows","quotes","zoom"
])

// -------------------------
// Restore last inputs from localStorage
// -------------------------
const savedInputs = JSON.parse(localStorage.getItem('cssscopeInputs') || '{}')
mode.value = savedInputs.mode || 'url'
username.value = savedInputs.username || ''
repo.value = savedInputs.repo || ''
url.value = savedInputs.url || ''
topN.value = savedInputs.topN || 4
localToken.value = savedInputs.localToken || ''

// Watch inputs & save to localStorage
watch([mode, username, repo, url, topN, localToken], () => {
  localStorage.setItem('cssscopeInputs', JSON.stringify({
    mode: mode.value,
    username: username.value,
    repo: repo.value,
    url: url.value,
    topN: topN.value,
    localToken: localToken.value
  }))
}, { deep: true })

// -------------------------
// Helpers
// -------------------------
watch(topN, val => {
  if (allResults.length) results.value = allResults.slice(0, val)
})

function updateResults(totalCounts){
  allResults = Object.entries(totalCounts).sort((a,b)=>b[1]-a[1])
  results.value = allResults.slice(0, topN.value)
}

function extractCSSProps(cssText){
  const regex = /([a-zA-Z-]+)\s*:/g
  const counts = {}
  let match
  while((match = regex.exec(cssText)) !== null){
    const prop = match[1].toLowerCase()
    if(standardProps.has(prop)) counts[prop] = (counts[prop]||0)+1
  }
  return counts
}

// -------------------------
// Analyze a website URL
// -------------------------
async function analyzeURL(siteURL){
  results.value=[]
  summary.value=null
  loading.value=true
  currentStatus.value="Fetching HTML..."
  startTimer()
  const startTime=performance.now()
  let totalCounts={}, fileCount=0, totalBytes=0

  try{
    if(!siteURL.startsWith("http")) siteURL="https://"+siteURL
    const proxiedURL=corsProxy + encodeURIComponent(siteURL)
    const res=await fetch(proxiedURL)
    if(!res.ok) throw new Error(res.status+" "+res.statusText)
    const htmlText=await res.text()

    currentStatus.value="Parsing CSS links..."
    const linkRegex=/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
    let match, cssFiles=[]
    while((match=linkRegex.exec(htmlText))!==null){
      let cssURL=match[1]
      if(!cssURL.startsWith("http")) {
        const base=new URL(siteURL)
        cssURL=new URL(cssURL, base).href
      }
      cssFiles.push(corsProxy + encodeURIComponent(cssURL))
    }

    currentStatus.value="Fetching CSS files..."
    for(const cssURL of cssFiles){
      try{
        currentStatus.value="Fetching "+cssURL
        const cssRes=await fetch(cssURL)
        if(!cssRes.ok) continue
        const cssText=await cssRes.text()
        totalBytes += new TextEncoder().encode(cssText).length
        fileCount++
        const counts=extractCSSProps(cssText)
        for(const [prop,cnt] of Object.entries(counts)) totalCounts[prop]=(totalCounts[prop]||0)+cnt
      }catch(e){ console.warn("Failed CSS fetch:",cssURL) }
    }

    updateResults(totalCounts)

    summary.value={
      time:(performance.now()-startTime)/1000,
      repos:1,
      files:fileCount,
      properties:Object.keys(totalCounts).length,
      bytes:totalBytes
    }
  }catch(e){ alert("Error: "+e.message) }
  finally{ loading.value=false; currentStatus.value=""; stopTimer() }
}

// -------------------------
// GitHub helpers
// -------------------------
async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: token() ? `Bearer ${token()}` : undefined,
      Accept: "application/vnd.github.v3+json"
    }
  })
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText)
  return res.json()
}

async function getAllCSSFiles(owner, repoName, path = "", branch = "main") {
  const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`
  try {
    const items = await fetchJSON(url)
    let files = []
    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".css")) files.push(item.download_url)
      else if (item.type === "dir") {
        const nested = await getAllCSSFiles(owner, repoName, item.path, branch)
        files.push(...nested)
      }
    }
    return files
  } catch(e) {
    if (e.message.startsWith("404")) {
      console.warn(`Repo ${owner}/${repoName} branch ${branch} is empty or path not found.`)
      return []
    }
    throw e
  }
}

// -------------------------
// Main analyze function
// -------------------------
async function analyze() {
  results.value = []
  summary.value = null
  loading.value = true
  startTimer()
  const startTime = performance.now()
  let repoCount = 0, fileCount = 0, totalBytes=0

  try {
    if (mode.value === 'url') {
      await analyzeURL(url.value)
      return
    }

    // GitHub mode
    let repos = []
    if (repo.value) {
      repos = [await fetchJSON(`https://api.github.com/repos/${username.value}/${repo.value}`)]
    } else {
      repos = await fetchJSON(`https://api.github.com/users/${username.value}/repos?per_page=100`)
    }

    repoCount = repos.length
    let totalCounts = {}

    for (const r of repos) {
      const branch = r.default_branch || "main"
      console.log(`Fetching repo contents: ${username.value}/${r.name} branch: ${branch}`)
      const cssFiles = await getAllCSSFiles(username.value, r.name, "", branch)
      fileCount += cssFiles.length

      for (const url of cssFiles) {
        const res = await fetch(url)
        if (!res.ok) continue
        const text = await res.text()
        totalBytes += new TextEncoder().encode(text).length
        const counts = extractCSSProps(text)
        for (const [prop, cnt] of Object.entries(counts)) totalCounts[prop] = (totalCounts[prop]||0)+cnt
      }
    }

    updateResults(totalCounts)

    summary.value = {
      time: (performance.now() - startTime)/1000,
      repos: repoCount,
      files: fileCount,
      properties: Object.keys(totalCounts).length,
      bytes: totalBytes
    }
  } catch(e) { alert("Error: " + e.message) }
  finally { loading.value=false; stopTimer() }
}
</script>
