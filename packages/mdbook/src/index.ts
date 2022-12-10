import type { Plugin } from "@web-printer/core"
import { delay } from "@web-printer/core"

export default function (options: { url: string }): Plugin {
  const { url } = options
  return {
    async fetchPagesInfo({ context }) {
      const page = await context.newPage()
      await page.goto(url)
      const data = JSON.parse(
        await page.evaluate(`
(() => {
  function genPageItem(node) {
    const a = node.childNodes[0]
    return {
      title: a?.innerText,
      url: a?.href
    }
  }
  function deepTransform(nodes, groups) {
    if (Array.isArray(nodes)) {
      const f = nodes.shift()
      const { title, url } = genPageItem(f)
      if (url)
        ret.push({
          title,
          url,
          selfGroup: true,
          groups: groups.map(f => ({ name: f }))
        })
      nodes.forEach(item => {
        deepTransform(item, [...groups, title])
      })
    } else {
      ret.push({
        ...genPageItem(nodes),
        groups: groups.map(name => ({ name }))
      })
    }
  }

  function deepFetch(nodes) {
    return nodes.reduce((acc, cur) => {
      if (!cur.className && acc.length) {
        const chapter = acc.pop()
        acc.push(deepFetch([chapter, ...cur.childNodes[0].childNodes]))
      } else {
        cur.innerText && acc.push(cur)
      }
      return acc
    }, [])
  }

  const nodes = [...document.querySelectorAll(".chapter > li:not(.affix, .spacer, .part-title)")]

  const ret = []
  deepFetch(nodes).forEach(items => {
    deepTransform(items, [])
  })
  ;[...document.querySelectorAll(".chapter > li:not(.affix, .spacer)")].reduce((acc, cur) => {
    if(cur.className.includes("part-title")) acc.partTitle = cur.innerText
    else if(acc.partTitle && cur.childNodes[0]?.href) {
      const title = cur.childNodes[0].innerText
      if(acc.items.length) acc.items[acc.items.length-1].push(title)
      acc.items.push([acc.partTitle, title])
      acc.partTitle = ""
    }
    return acc
  },{ items: [], partTitle: "" }).items.forEach(item => {
    let flag = false
    ret.forEach(k=>{
      if(k.title === item[1]) flag = true
      else if(k.title === item[2]) flag = false
      flag && k.groups.unshift({ name: item[0] })
    })
  })
  return JSON.stringify(ret, null, 2)
})()
  `)
      )
      await page.close()
      return data
    },
    async beforePrint({ page }) {
      await delay(700)
    },
    injectStyle() {
      const style = `
#menu-bar,
#giscus-container,
.nav-wrapper,
.sidetoc {
    display: none !important;
}

main {
    margin: 0 !important;
}

main > * {
    margin-top: 0
}

#page-wrapper > div,
#content {
    padding: 0;
}

code:not(.hljs) {
    background-color: #f6f7f6 !important;
}

`
      return {
        style,
        titleSelector: `main`
      }
    }
  }
}
