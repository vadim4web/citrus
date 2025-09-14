<template>
  <div class="p-6">
    <h1 class="cssscope text-2xl font-bold mb-4 py-3 leading-9">
      🍊<strong>Citrus <span class="analyze">(C3S)</span> Analyzer</strong> | <i>CSS S</i>cope <em class="analyze">Analyzer</em>
    </h1>

    <div class="mb-4">
      <label><input type="radio" value="github" v-model="mode" /> GitHub user/org</label>
      <label class="ml-4"><input type="radio" value="url" v-model="mode" /> Website URL</label>
    </div>

    <div class="space-y-2 mb-4">
      <template v-if="mode == 'github'">
        <label>GitHub Token (optional): <input v-model="localToken" type="password" class="border rounded p-1 w-full"/></label>
        <label>Username (or org): <input v-model="username" class="border rounded p-1 w-full"/></label>
        <label>Repo (optional): <input v-model="repo" class="border rounded p-1 w-full"/></label>
      </template>

      <template v-else>
        <label>Static Site URL: <input v-model="url" type="text" class="border rounded p-1 w-full"/></label>
      </template>

      <label class="inline-flex gap-1 mr-1">Top N: ({{ topN }})
        <input type="range" min="1" max="25" step="3" v-model="topN" class="border rounded p-1 bg-gray-500" />
      </label>

      <button @click="analyze" class="px-3 py-1 rounded mt-2 bg-indigo-600 text-white">Analyze IT!</button>
    </div>

    <div v-if="loading" class="mt-4">Analyzing... {{ currentStatus }}</div>

    <div v-if="summary" class="mt-4 p-2 border rounded bg-gray-500">
      <p><strong>Summary:</strong></p>
      <ul>
        <li>Time taken: {{ summary.time.toFixed(2) }}s</li>
        <li>Repositories analyzed: {{ summary.repos }}</li>
        <li>CSS files analyzed: {{ summary.files }}</li>
        <li>Distinct CSS properties found: {{ summary.properties }}</li>
        <li>Total CSS size: {{ (summary.bytes/1024).toFixed(2) }} KB</li>
      </ul>
    </div>

    <div v-if="results.length" class="mt-6">
      <h2 class="text-xl font-semibold mb-2">Top {{ topN }} CSS Properties</h2>
      <table class="border-collapse border border-gray-300 w-full">
        <thead>
          <tr class="bg-gray-500">
            <th class="border border-gray-300 px-2 py-1">Property</th>
            <th class="border border-gray-300 px-2 py-1">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item,i) in results" :key="i">
            <td class="border border-gray-300 px-2 py-1">{{ item[0] }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ item[1] }}</td>
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
let allResults = []  // Global RAM storage

const corsProxy = "https://api.allorigins.win/raw?url="
const token = () => localToken.value || ''

// -------------------------
// Standard CSS properties
// -------------------------
const standardProps = new Set([
  "align-content","align-items","align-self","all","animation","animation-delay",
  "animation-direction","animation-duration","animation-fill-mode","animation-iteration-count",
  "animation-name","animation-play-state","animation-timing-function","backface-visibility",
  "background","background-attachment","background-blend-mode","background-clip","background-color",
  "background-image","background-origin","background-position","background-repeat","background-size",
  "border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius",
  "border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset",
  "border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left",
  "border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color",
  "border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color",
  "border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width",
  "bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side",
  "caret-color","clear","clip","color","column-count","column-fill","column-gap","column-rule","column-rule-color",
  "column-rule-style","column-rule-width","column-span","column-width","columns","content","counter-increment",
  "counter-reset","cursor","direction","display","empty-cells","filter","flex","flex-basis","flex-direction",
  "flex-flow","flex-grow","flex-shrink","flex-wrap","float","font","font-family","font-feature-settings",
  "font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis",
  "font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures",
  "font-variant-numeric","font-variant-position","font-weight","gap","grid","grid-area","grid-auto-columns",
  "grid-auto-flow","grid-auto-rows","grid-column","grid-column-end","grid-column-gap","grid-column-start","grid-gap",
  "grid-row","grid-row-end","grid-row-gap","grid-row-start","grid-template","grid-template-areas","grid-template-columns",
  "grid-template-rows","hanging-punctuation","height","hyphens","image-rendering","isolation","justify-content","left",
  "letter-spacing","line-break","line-height","list-style","list-style-image","list-style-position","list-style-type",
  "margin","margin-bottom","margin-left","margin-right","margin-top","mask","mask-clip","mask-composite","mask-image",
  "mask-mode","mask-origin","mask-position","mask-repeat","mask-size","mask-type","max-height","max-width","min-height",
  "min-width","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset",
  "outline-style","outline-width","overflow","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom",
  "padding-left","padding-right","padding-top","page-break-after","page-break-before","page-break-inside","perspective",
  "perspective-origin","place-content","place-items","place-self","pointer-events","position","quotes","resize","right",
  "scroll-behavior","tab-size","table-layout","text-align","text-align-last","text-combine-upright","text-decoration",
  "text-decoration-color","text-decoration-line","text-decoration-style","text-indent","text-justify","text-orientation",
  "text-overflow","text-shadow","text-transform","text-underline-position","top","transform","transform-origin","transform-style",
  "transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi",
  "user-select","vertical-align","visibility","white-space","widows","width","word-break","word-spacing","word-wrap","writing-mode",
  "z-index"
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
  finally{ loading.value=false; currentStatus.value="" }
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
  } catch(e) {
    alert("Error: " + e.message)
  } finally {
    loading.value = false
  }
}
</script>
