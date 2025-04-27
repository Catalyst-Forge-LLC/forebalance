var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
import { __awaiter, __generator, __spread } from "tslib";
import marked from "marked";
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone = {};
  for (const key in obj) {
    clone[key.toLowerCase()] = obj[key];
  }
  return clone;
}
function error$1(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const params = route.params(match);
  const response = await handler({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error$1(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error$1(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop$1() {
}
function safe_not_equal$1(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
const subscriber_queue$1 = [];
function writable$1(value, start = noop$1) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal$1(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue$1.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue$1.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue$1.length; i += 2) {
            subscriber_queue$1[i][0](subscriber_queue$1[i + 1]);
          }
          subscriber_queue$1.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
const escape_json_string_in_html_dict = {
  '"': '\\"',
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape_json_string_in_html(str) {
  return escape$1(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
const escape_html_attr_dict = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function escape_html_attr(str) {
  return '"' + escape$1(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape$1(str, dict, unicode_encoder) {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
const s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable$1($session);
    const props = {
      stores: {
        page: writable$1(null),
        navigating: writable$1(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page && page.path)},
						query: new URLSearchParams(${page ? s$1(page.query.toString()) : ""}),
						params: ${page && s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
const s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options2.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
const absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
class ReadOnlyFormData {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
}
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
  let value;
  subscribe(store, (_) => value = _)();
  return value;
}
function set_store_value(store, ret, value) {
  store.set(value);
  return ret;
}
function custom_event(type, detail, bubbles = false) {
  const e = document.createEvent("CustomEvent");
  e.initCustomEvent(type, bubbles, false, detail);
  return e;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(type, detail);
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
    }
  };
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function getContext(key) {
  return get_current_component().$$.context.get(key);
}
Promise.resolve();
const escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
const missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
let on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var root_svelte_svelte_type_style_lang = "";
const css$c = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$c);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
let base = "";
let assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
const template = ({ head, body }) => `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="theme-color" content="#009900">
		<meta name="viewport" content="width=device-width, initial-scale=1" />

		<link rel="stylesheet" href="bootstrap-reboot.min.css">
		<link rel="icon" href="/favicon.ico" />
		<link rel="manifest" href="manifest.json" crossorigin="use-credentials">

		<script>
			// Force HTTPS
			let address = window.location.href;
			if (address.startsWith('http:') && !address.includes('://localhost')) {
				window.location = address.replace(/^http/, 'https') + '?cb=' + (new Date()).getTime();
			}
		<\/script>

		<style>
			#svelte {
				display: flex;
				flex-direction: column;
				height: 100vh;
			}
		</style>
	
		<script src="dayjs.min.js"><\/script>

		` + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
let options = null;
const default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-e5a966b3.js",
      css: [assets + "/_app/assets/start-61d1577b.css", assets + "/_app/assets/vendor-ff184c56.css"],
      js: [assets + "/_app/start-e5a966b3.js", assets + "/_app/chunks/vendor-27ccefdb.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
const empty = () => ({});
const manifest = {
  assets: [{ "file": "bootstrap-reboot.min.css", "size": 4769, "type": "text/css" }, { "file": "dayjs.min.js", "size": 6571, "type": "application/javascript" }, { "file": "global.css", "size": 9570, "type": "text/css" }, { "file": "manifest.json", "size": 340, "type": "application/json" }, { "file": "md/help.md", "size": 2758, "type": "text/markdown" }, { "file": "md/welcome.md", "size": 851, "type": "text/markdown" }],
  layout: "src/routes/__layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/about\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    }
  ]
};
const get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
const module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/about.svelte": () => Promise.resolve().then(function() {
    return about;
  })
};
const metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-77d80619.js", "css": ["assets/pages/__layout.svelte-41dbe9df.css", "assets/vendor-ff184c56.css"], "js": ["pages/__layout.svelte-77d80619.js", "chunks/vendor-27ccefdb.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-0fd9e526.js", "css": ["assets/vendor-ff184c56.css"], "js": ["error.svelte-0fd9e526.js", "chunks/vendor-27ccefdb.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-3cbb8682.js", "css": ["assets/pages/index.svelte-09def4f7.css", "assets/vendor-ff184c56.css"], "js": ["pages/index.svelte-3cbb8682.js", "chunks/vendor-27ccefdb.js"], "styles": [] }, "src/routes/about.svelte": { "entry": "pages/about.svelte-13efa8a9.js", "css": ["assets/vendor-ff184c56.css"], "js": ["pages/about.svelte-13efa8a9.js", "chunks/vendor-27ccefdb.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var Footer_svelte_svelte_type_style_lang = "";
const css$b = {
  code: "footer.svelte-s2w7cc{bottom:0;left:0;width:100vw;z-index:1000;text-align:center;background-color:#009900;color:#FFF;font-size:min(3.75vw, 1.75rem);font-weight:400;margin-top:0;display:block;padding:0.5rem;border-top-left-radius:0.5rem;border-top-right-radius:2rem;border-top:1px solid #fff;text-shadow:1px 1px 1px rgba(0, 0, 0, 0.75);box-shadow:0 -0.25rem 0.5rem rgba(0, 0, 0, 0.5)}",
  map: '{"version":3,"file":"Footer.svelte","sources":["Footer.svelte"],"sourcesContent":["<footer>\\r\\n\\t&copy;2020-2021 AcmeGeek Labs, LLC\\r\\n</footer>\\r\\n\\r\\n<style lang=\\"scss\\">footer {\\n  bottom: 0;\\n  left: 0;\\n  width: 100vw;\\n  z-index: 1000;\\n  text-align: center;\\n  background-color: #009900;\\n  color: #FFF;\\n  font-size: min(3.75vw, 1.75rem);\\n  font-weight: 400;\\n  margin-top: 0;\\n  display: block;\\n  padding: 0.5rem;\\n  border-top-left-radius: 0.5rem;\\n  border-top-right-radius: 2rem;\\n  border-top: 1px solid #fff;\\n  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.75);\\n  box-shadow: 0 -0.25rem 0.5rem rgba(0, 0, 0, 0.5);\\n}</style>"],"names":[],"mappings":"AAImB,MAAM,cAAC,CAAC,AACzB,MAAM,CAAE,CAAC,CACT,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,KAAK,CACZ,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,MAAM,CAClB,gBAAgB,CAAE,OAAO,CACzB,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,IAAI,MAAM,CAAC,CAAC,OAAO,CAAC,CAC/B,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,CAAC,CACb,OAAO,CAAE,KAAK,CACd,OAAO,CAAE,MAAM,CACf,sBAAsB,CAAE,MAAM,CAC9B,uBAAuB,CAAE,IAAI,CAC7B,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,CAC1B,WAAW,CAAE,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CAC5C,UAAU,CAAE,CAAC,CAAC,QAAQ,CAAC,MAAM,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAClD,CAAC"}'
};
const Footer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$b);
  return `<footer class="${"svelte-s2w7cc"}">\xA92020-2021 AcmeGeek Labs, LLC
</footer>`;
});
const subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
const settingsStore = writable({
  thresholdGoalBalance: 5e3,
  thresholdUncomfortableBalance: 1e3,
  thresholdLowBalance: 500,
  monthsToForecast: 6,
  locale: "en-US",
  currencyIsoCode: "USD"
});
const rawEntriesStore = writable("");
const appStateStore = writable({
  showLoader: false
});
var Header_svelte_svelte_type_style_lang = "";
const css$a = {
  code: "header.svelte-1a5wg57.svelte-1a5wg57{top:0;left:0;width:100%}header.svelte-1a5wg57 h1.svelte-1a5wg57{text-align:center;background-color:#009900;color:#FFF;text-transform:uppercase;font-size:min(7vw, 4rem);font-weight:100;line-height:1.1;margin:0 0 1rem 0;padding:0.5rem 0;border-bottom-left-radius:3rem;border-bottom-right-radius:1rem;border-bottom:1px solid rgba(255, 255, 255, 0.66);text-shadow:1px 1px 5px rgba(0, 0, 0, 0.5);box-shadow:inset 0 2rem 4rem -2rem rgba(0, 0, 0, 0.5), inset 0 0.5rem 1rem -0.5rem rgba(0, 0, 0, 0.95), 0 0 0.15rem rgba(0, 0, 0, 0.85), 0 0.25rem 0.5rem rgba(0, 0, 0, 0.5)}",
  map: `{"version":3,"file":"Header.svelte","sources":["Header.svelte"],"sourcesContent":["<script>\\r\\n\\timport { appStateStore } from '../scripts/stores';\\r\\n<\/script>\\r\\n<header>\\r\\n\\t<h1>My Balance Forecaster</h1>\\r\\n</header>\\r\\n\\r\\n<style lang=\\"scss\\">header {\\n  top: 0;\\n  left: 0;\\n  width: 100%;\\n}\\nheader h1 {\\n  text-align: center;\\n  background-color: #009900;\\n  color: #FFF;\\n  text-transform: uppercase;\\n  font-size: min(7vw, 4rem);\\n  font-weight: 100;\\n  line-height: 1.1;\\n  margin: 0 0 1rem 0;\\n  padding: 0.5rem 0;\\n  border-bottom-left-radius: 3rem;\\n  border-bottom-right-radius: 1rem;\\n  border-bottom: 1px solid rgba(255, 255, 255, 0.66);\\n  text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);\\n  box-shadow: inset 0 2rem 4rem -2rem rgba(0, 0, 0, 0.5), inset 0 0.5rem 1rem -0.5rem rgba(0, 0, 0, 0.95), 0 0 0.15rem rgba(0, 0, 0, 0.85), 0 0.25rem 0.5rem rgba(0, 0, 0, 0.5);\\n}</style>"],"names":[],"mappings":"AAOmB,MAAM,8BAAC,CAAC,AACzB,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,IAAI,AACb,CAAC,AACD,qBAAM,CAAC,EAAE,eAAC,CAAC,AACT,UAAU,CAAE,MAAM,CAClB,gBAAgB,CAAE,OAAO,CACzB,KAAK,CAAE,IAAI,CACX,cAAc,CAAE,SAAS,CACzB,SAAS,CAAE,IAAI,GAAG,CAAC,CAAC,IAAI,CAAC,CACzB,WAAW,CAAE,GAAG,CAChB,WAAW,CAAE,GAAG,CAChB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAClB,OAAO,CAAE,MAAM,CAAC,CAAC,CACjB,yBAAyB,CAAE,IAAI,CAC/B,0BAA0B,CAAE,IAAI,CAChC,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,CAClD,WAAW,CAAE,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAC3C,UAAU,CAAE,KAAK,CAAC,CAAC,CAAC,IAAI,CAAC,IAAI,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,MAAM,CAAC,IAAI,CAAC,OAAO,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,OAAO,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,OAAO,CAAC,MAAM,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC/K,CAAC"}`
};
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$a);
  return `<header class="${"svelte-1a5wg57"}"><h1 class="${"svelte-1a5wg57"}">My Balance Forecaster</h1>
</header>`;
});
var app = "";
var __layout_svelte_svelte_type_style_lang = "";
const css$9 = {
  code: "main.svelte-tys5zh{flex-grow:1;max-width:56em;padding:0;margin:0 auto;overflow:overlay;position:relative}p{text-align:left}code, pre{font-family:menlo, inconsolata, monospace;font-size:1rem;color:#555;background-color:#f0f0f0;padding:0.2rem 0.4rem;border-radius:2px}",
  map: `{"version":3,"file":"__layout.svelte","sources":["__layout.svelte"],"sourcesContent":["<script>\\n\\timport Footer from \\"../components/Footer.svelte\\";\\n\\timport Header from \\"../components/Header.svelte\\";\\n\\timport '../app.scss';\\n<\/script>\\n\\n<style lang=\\"scss\\">main {\\n  flex-grow: 1;\\n  max-width: 56em;\\n  padding: 0;\\n  margin: 0 auto;\\n  overflow: overlay;\\n  position: relative;\\n}\\n\\n:global(p) {\\n  text-align: left;\\n}\\n\\n:global(code, pre) {\\n  font-family: menlo, inconsolata, monospace;\\n  font-size: 1rem;\\n  color: #555;\\n  background-color: #f0f0f0;\\n  padding: 0.2rem 0.4rem;\\n  border-radius: 2px;\\n}</style>\\n\\n<Header></Header>\\n\\n<main>\\n\\t<slot></slot>\\n</main>\\n\\n<Footer></Footer>"],"names":[],"mappings":"AAMmB,IAAI,cAAC,CAAC,AACvB,SAAS,CAAE,CAAC,CACZ,SAAS,CAAE,IAAI,CACf,OAAO,CAAE,CAAC,CACV,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,QAAQ,CAAE,OAAO,CACjB,QAAQ,CAAE,QAAQ,AACpB,CAAC,AAEO,CAAC,AAAE,CAAC,AACV,UAAU,CAAE,IAAI,AAClB,CAAC,AAEO,SAAS,AAAE,CAAC,AAClB,WAAW,CAAE,KAAK,CAAC,CAAC,WAAW,CAAC,CAAC,SAAS,CAC1C,SAAS,CAAE,IAAI,CACf,KAAK,CAAE,IAAI,CACX,gBAAgB,CAAE,OAAO,CACzB,OAAO,CAAE,MAAM,CAAC,MAAM,CACtB,aAAa,CAAE,GAAG,AACpB,CAAC"}`
};
const _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$9);
  return `${validate_component(Header, "Header").$$render($$result, {}, {}, {})}

<main class="${"svelte-tys5zh"}">${slots.default ? slots.default({}) : ``}</main>

${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
function load({ error: error2, status }) {
  return { props: { error: error2, status } };
}
const Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape(status)}</h1>

<pre>${escape(error2.message)}</pre>



${error2.frame ? `<pre>${escape(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load
});
var Tabs_svelte_svelte_type_style_lang = "";
const css$8 = {
  code: ".tabs.svelte-15ofb7m{width:100vw;height:100%;max-width:56em;flex-grow:1;display:flex;flex-direction:column}",
  map: `{"version":3,"file":"Tabs.svelte","sources":["Tabs.svelte"],"sourcesContent":["<script context=\\"module\\">\\n\\texport const TABS = {};\\n<\/script>\\n\\n<script>\\n\\timport { appStateStore } from '../scripts/stores';\\n\\n\\timport { setContext, onDestroy } from 'svelte';\\n\\timport { writable } from 'svelte/store';\\n\\n\\tconst tabs = [];\\n\\tconst panels = [];\\n\\tconst selectedTab = writable(null);\\n\\tconst selectedPanel = writable(null);\\n\\n\\tsetContext(TABS, {\\n\\t\\tregisterTab: tab => {\\n\\t\\t\\ttabs.push(tab);\\n\\t\\t\\tselectedTab.update(current => current || tab);\\n\\t\\t\\tonDestroy(() => {\\n\\t\\t\\t\\tconst i = tabs.indexOf(tab);\\n\\t\\t\\t\\ttabs.splice(i, 1);\\n\\t\\t\\t\\tselectedTab.update(current => current === tab ? (tabs[i] || tabs[tabs.length - 1]) : current);\\n\\t\\t\\t});\\n\\t\\t},\\n\\n\\t\\tregisterPanel: panel => {\\n\\t\\t\\tpanels.push(panel);\\n\\t\\t\\tselectedPanel.update(current => current || panel);\\n\\t\\t\\t\\n\\t\\t\\tonDestroy(() => {\\n\\t\\t\\t\\tconst i = panels.indexOf(panel);\\n\\t\\t\\t\\tpanels.splice(i, 1);\\n\\t\\t\\t\\tselectedPanel.update(current => current === panel ? (panels[i] || panels[panels.length - 1]) : current);\\n\\t\\t\\t});\\n\\t\\t},\\n\\n\\t\\tselectTab: (tab, tabText) => {\\n\\t\\t\\tconst i = tabs.indexOf(tab);\\n\\t\\t\\tselectedTab.set(tab);\\n\\t\\t\\tif (panels[i].showLoader) {\\n\\t\\t\\t\\t$appStateStore.showLoader = true;\\n\\t\\t\\t}\\n\\t\\t\\twindow.location = \`#\${tabText}\`;\\n\\t\\t\\tsetTimeout(() => {\\n\\t\\t\\t\\tselectedPanel.set(panels[i]);\\n\\t\\t\\t}, 300);\\n\\t\\t},\\n\\n\\t\\tselectedTab,\\n\\t\\tselectedPanel\\n\\t});\\n<\/script>\\n\\n<div class=\\"tabs\\">\\n\\t<slot></slot>\\n</div>\\n\\n<style lang=\\"scss\\">.tabs {\\n  width: 100vw;\\n  height: 100%;\\n  max-width: 56em;\\n  flex-grow: 1;\\n  display: flex;\\n  flex-direction: column;\\n}</style>"],"names":[],"mappings":"AA0DmB,KAAK,eAAC,CAAC,AACxB,KAAK,CAAE,KAAK,CACZ,MAAM,CAAE,IAAI,CACZ,SAAS,CAAE,IAAI,CACf,SAAS,CAAE,CAAC,CACZ,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,AACxB,CAAC"}`
};
const TABS = {};
const Tabs = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $appStateStore, $$unsubscribe_appStateStore;
  $$unsubscribe_appStateStore = subscribe(appStateStore, (value) => $appStateStore = value);
  const tabs = [];
  const panels = [];
  const selectedTab = writable(null);
  const selectedPanel = writable(null);
  setContext(TABS, {
    registerTab: (tab) => {
      tabs.push(tab);
      selectedTab.update((current) => current || tab);
      onDestroy(() => {
        const i = tabs.indexOf(tab);
        tabs.splice(i, 1);
        selectedTab.update((current) => current === tab ? tabs[i] || tabs[tabs.length - 1] : current);
      });
    },
    registerPanel: (panel) => {
      panels.push(panel);
      selectedPanel.update((current) => current || panel);
      onDestroy(() => {
        const i = panels.indexOf(panel);
        panels.splice(i, 1);
        selectedPanel.update((current) => current === panel ? panels[i] || panels[panels.length - 1] : current);
      });
    },
    selectTab: (tab, tabText) => {
      const i = tabs.indexOf(tab);
      selectedTab.set(tab);
      if (panels[i].showLoader) {
        set_store_value(appStateStore, $appStateStore.showLoader = true, $appStateStore);
      }
      window.location = `#${tabText}`;
      setTimeout(() => {
        selectedPanel.set(panels[i]);
      }, 300);
    },
    selectedTab,
    selectedPanel
  });
  $$result.css.add(css$8);
  $$unsubscribe_appStateStore();
  return `<div class="${"tabs svelte-15ofb7m"}">${slots.default ? slots.default({}) : ``}
</div>`;
});
var TabList_svelte_svelte_type_style_lang = "";
const css$7 = {
  code: ".tab-list.svelte-1qkp052{display:flex;border-bottom:1px solid teal}",
  map: '{"version":3,"file":"TabList.svelte","sources":["TabList.svelte"],"sourcesContent":["<div class=\\"tab-list\\">\\n\\t<slot></slot>\\n</div>\\n\\n<style>\\n\\t.tab-list {\\n\\t\\tdisplay: flex;\\n\\t\\tborder-bottom: 1px solid teal;\\n\\t}\\n</style>"],"names":[],"mappings":"AAKC,SAAS,eAAC,CAAC,AACV,OAAO,CAAE,IAAI,CACb,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,AAC9B,CAAC"}'
};
const TabList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$7);
  return `<div class="${"tab-list svelte-1qkp052"}">${slots.default ? slots.default({}) : ``}
</div>`;
});
const TabPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $selectedPanel, $$unsubscribe_selectedPanel;
  let { showLoader = false } = $$props;
  const panel = { showLoader };
  const { registerPanel, selectedPanel } = getContext(TABS);
  $$unsubscribe_selectedPanel = subscribe(selectedPanel, (value) => $selectedPanel = value);
  registerPanel(panel);
  if ($$props.showLoader === void 0 && $$bindings.showLoader && showLoader !== void 0)
    $$bindings.showLoader(showLoader);
  $$unsubscribe_selectedPanel();
  return `${$selectedPanel === panel ? `${slots.default ? slots.default({}) : ``}` : ``}`;
});
var Tab_svelte_svelte_type_style_lang = "";
const css$6 = {
  code: "button.svelte-fftof6{flex:1;background:none;border:none;border-bottom:2px solid rgba(0, 0, 0, 0.5);border-radius:0;margin:0;padding:0.25rem 0.5rem;color:#050;transition:border 0.15s, border-radius 0.15s;font-size:0.85rem}button.selected.svelte-fftof6{border:none;color:#FFF;border-bottom:2px solid #990099;border-top-left-radius:0.5rem;border-top-right-radius:1.5rem;background-color:#990099;font-weight:700;box-shadow:inset 0 -0.25rem 1rem -0.5rem rgba(0, 0, 0, 0.5), 0 0 0.5rem rgba(0, 0, 0, 0.5);border-top:1px solid rgba(255, 255, 255, 0.85);text-shadow:1px 1px 2px rgba(0, 0, 0, 0.5)}button.svelte-fftof6:focus{outline:none}",
  map: `{"version":3,"file":"Tab.svelte","sources":["Tab.svelte"],"sourcesContent":["<script>\\n\\timport { getContext, onMount } from 'svelte';\\n\\timport { TABS } from './Tabs.svelte';\\n\\n\\tlet button;\\n\\tlet tabText = '';\\n\\n\\tconst tab = {};\\n\\tconst { registerTab, selectTab, selectedTab } = getContext(TABS);\\n\\n\\tregisterTab(tab);\\n\\n\\tonMount(() => {\\n\\t\\ttabText = button.innerText.toLowerCase();\\n\\t\\tif (window.location.hash.includes(tabText)) {\\n\\t\\t\\tselectTab(tab, tabText);\\n\\t\\t}\\n\\t});\\n<\/script>\\n\\n<style lang=\\"scss\\">button {\\n  flex: 1;\\n  background: none;\\n  border: none;\\n  border-bottom: 2px solid rgba(0, 0, 0, 0.5);\\n  border-radius: 0;\\n  margin: 0;\\n  padding: 0.25rem 0.5rem;\\n  color: #050;\\n  transition: border 0.15s, border-radius 0.15s;\\n  font-size: 0.85rem;\\n}\\nbutton.selected {\\n  border: none;\\n  color: #FFF;\\n  border-bottom: 2px solid #990099;\\n  border-top-left-radius: 0.5rem;\\n  border-top-right-radius: 1.5rem;\\n  background-color: #990099;\\n  font-weight: 700;\\n  box-shadow: inset 0 -0.25rem 1rem -0.5rem rgba(0, 0, 0, 0.5), 0 0 0.5rem rgba(0, 0, 0, 0.5);\\n  border-top: 1px solid rgba(255, 255, 255, 0.85);\\n  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);\\n}\\nbutton:focus {\\n  outline: none;\\n}</style>\\n\\n<button bind:this={button} class:selected=\\"{$selectedTab === tab}\\" on:click=\\"{() => selectTab(tab, tabText)}\\">\\n\\t<slot></slot>\\n</button>"],"names":[],"mappings":"AAoBmB,MAAM,cAAC,CAAC,AACzB,IAAI,CAAE,CAAC,CACP,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,IAAI,CACZ,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAC3C,aAAa,CAAE,CAAC,CAChB,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,OAAO,CAAC,MAAM,CACvB,KAAK,CAAE,IAAI,CACX,UAAU,CAAE,MAAM,CAAC,KAAK,CAAC,CAAC,aAAa,CAAC,KAAK,CAC7C,SAAS,CAAE,OAAO,AACpB,CAAC,AACD,MAAM,SAAS,cAAC,CAAC,AACf,MAAM,CAAE,IAAI,CACZ,KAAK,CAAE,IAAI,CACX,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,OAAO,CAChC,sBAAsB,CAAE,MAAM,CAC9B,uBAAuB,CAAE,MAAM,CAC/B,gBAAgB,CAAE,OAAO,CACzB,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,KAAK,CAAC,CAAC,CAAC,QAAQ,CAAC,IAAI,CAAC,OAAO,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,MAAM,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAC3F,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,CAC/C,WAAW,CAAE,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC7C,CAAC,AACD,oBAAM,MAAM,AAAC,CAAC,AACZ,OAAO,CAAE,IAAI,AACf,CAAC"}`
};
const Tab = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $selectedTab, $$unsubscribe_selectedTab;
  let button;
  const tab = {};
  const { registerTab, selectTab, selectedTab } = getContext(TABS);
  $$unsubscribe_selectedTab = subscribe(selectedTab, (value) => $selectedTab = value);
  registerTab(tab);
  $$result.css.add(css$6);
  $$unsubscribe_selectedTab();
  return `<button class="${["svelte-fftof6", $selectedTab === tab ? "selected" : ""].join(" ").trim()}"${add_attribute("this", button, 0)}>${slots.default ? slots.default({}) : ``}</button>`;
});
const locale = get_store_value(settingsStore).locale;
const currencyIsoCode = get_store_value(settingsStore).currencyIsoCode;
const currFormtter = new Intl.NumberFormat(get_store_value(settingsStore).locale, {
  style: "currency",
  currency: currencyIsoCode,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const fmt = {
  date: (val) => (val ? val : new Date()).toLocaleDateString(locale, {
    year: "2-digit",
    month: "numeric",
    day: "numeric"
  }),
  date2: (val) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(val ? val : new Date()),
  date3: (val) => (val ? val : new Date()).toISOString().substring(0, 10),
  upper: (val) => val.toUpperCase(),
  lower: (val) => val.toLowerCase(),
  curr: (val) => currFormtter.format(val),
  pct: (val) => Math.floor(val * 100) + "%"
};
const getRandomId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};
const getDate = (rawDate) => {
  if (rawDate === null) {
    return null;
  }
  rawDate = rawDate.split("-");
  return new Date(+rawDate[0], +rawDate[1] - 1, +rawDate[2]);
};
const parseDate = (rawDate) => {
  if (!rawDate) {
    return;
  }
  rawDate = rawDate.replace(/-R/g, ",R");
  let [startDate, recur = "", endDate = null] = rawDate.split(",");
  startDate = getDate(startDate);
  endDate = getDate(endDate);
  return [
    startDate,
    parseRecur(recur),
    recur,
    endDate
  ];
};
const getBalanceFlag = (bal, balanceFlags) => {
  let balanceFlag = "";
  Object.entries(balanceFlags.below).forEach(([flag, threshold]) => {
    if (balanceFlag === "" && bal < threshold) {
      balanceFlag = flag;
    }
  });
  Object.entries(balanceFlags.above).forEach(([flag, threshold]) => {
    if (balanceFlag === "" && bal > threshold) {
      balanceFlag = flag;
    }
  });
  return balanceFlag;
};
let sortEntries = (entries) => {
  entries.sort((a, b) => a.date.valueOf() > b.date.valueOf() ? 1 : a.date.valueOf() === b.date.valueOf() ? a.type > b.type ? 1 : -1 : -1);
};
const freqs = {
  D: "day",
  W: "week",
  M: "month",
  Y: "year"
};
const recurringEntries = {};
let parseRecur = (recur) => {
  const parsedRecur = recur !== "" ? {} : null;
  if (parsedRecur === null) {
    return parsedRecur;
  }
  let regexpRecur = /R([0-9]*)([DWMY]?)([0-9]*)/;
  let [recurRaw, multiple, freq, count] = regexpRecur.exec(recur.toUpperCase());
  parsedRecur.freq = freq === "" ? "M" : freq;
  parsedRecur.multiple = multiple === "" ? 1 : +multiple;
  parsedRecur.count = count === "" ? null : +count;
  parsedRecur.recurRaw = recurRaw;
  return parsedRecur;
};
let updateDescRecur = (desc, recur, rIndex) => {
  return desc.replace(/\(#[0-9]+(\/[0-9]+)?\)/g, "") + ` (#${rIndex}${recur.count !== null ? `/${recur.count}` : ""})`;
};
let updateDateRecur = (date, recur) => {
  let dateRecur = dayjs(date);
  dateRecur = dateRecur.add(recur.multiple, freqs[recur.freq]);
  dateRecur = dateRecur.toDate();
  return dateRecur;
};
let parseEntries = (rawEntries, monthsToForecast, balanceFlags) => {
  let parsedEntries = rawEntries.trim().split("\n").map((entry) => {
    if (entry && entry.length > 0) {
      if (entry.startsWith("---")) {
        return {
          id: getRandomId(),
          type: "G",
          group: entry.replace("--- ", "")
        };
      }
      const rawEntry = entry;
      entry = entry.split("|");
      let [type, account] = entry[0].toUpperCase().split("-");
      let parsedEntry = {
        id: getRandomId(),
        type,
        amount: entry[2],
        desc: entry[3],
        rawEntry
      };
      if (account && account.length > 0) {
        parsedEntry.account = account;
      }
      [parsedEntry.date, parsedEntry.recur, parsedEntry.rawRecur, parsedEntry.endDate] = parseDate(entry[1]);
      if (!recurringEntries[parsedEntry.id]) {
        recurringEntries[parsedEntry.id] = 1;
      }
      if (parsedEntry.recur !== null) {
        parsedEntry.desc = updateDescRecur(parsedEntry.desc, parsedEntry.recur, recurringEntries[parsedEntry.id]);
      }
      return parsedEntry;
    }
  });
  if (!typeof parsedEntries[0].date === "object") {
    console.error("error parsing the date.", parsedEntries);
    return;
  }
  parsedEntries = parsedEntries.filter((entry) => entry.type !== "G");
  const balanceDate = parsedEntries.filter((entry) => entry.type === "B")[0].date;
  const endDate = dayjs(balanceDate).add(monthsToForecast, "month").endOf("month").toDate();
  sortEntries(parsedEntries);
  const tableEntries = [];
  while (parsedEntries.length > 0) {
    parsedEntries.forEach((entry, i) => {
      tableEntries.push(entry);
      if (entry.recur) {
        let newEntry = { ...entry };
        ++recurringEntries[newEntry.id];
        newEntry.date = updateDateRecur(newEntry.date, newEntry.recur);
        newEntry.desc = updateDescRecur(newEntry.desc, newEntry.recur, recurringEntries[newEntry.id]);
        if (newEntry.date <= (newEntry.endDate === null ? endDate : newEntry.endDate) && (newEntry.recur.count === null || newEntry.recur.count !== null && recurringEntries[newEntry.id] <= newEntry.recur.count)) {
          parsedEntries.push(newEntry);
        }
      }
      parsedEntries.splice(i, 1);
    });
  }
  sortEntries(tableEntries);
  let balance = 0;
  let balanceIndex = 0;
  tableEntries.forEach((entry, i) => {
    if (entry.type === "C") {
      balance += +entry.amount;
    } else if (entry.type === "D") {
      balance -= +entry.amount;
    } else if (entry.type === "B") {
      balance = +entry.amount;
      balanceIndex = i;
    }
    entry.balance = +balance;
    entry.formattedDate = fmt.date(entry.date);
    entry.formattedCredit = entry.type === "C" ? fmt.curr(entry.amount) : "";
    entry.formattedDebit = entry.type === "D" ? fmt.curr(entry.amount) : "";
    entry.formattedBalance = fmt.curr(entry.balance);
    entry.flag = getBalanceFlag(entry.balance, balanceFlags);
  });
  tableEntries.splice(0, balanceIndex);
  return tableEntries;
};
var ForecastTable_svelte_svelte_type_style_lang = "";
const css$5 = {
  code: "table.svelte-wk1571.svelte-wk1571{width:calc(100% - 2rem);margin:0 0.125rem;font-family:monospace;font-size:0.75rem;transform:opacity 2s}table.svelte-wk1571 td.svelte-wk1571{padding:0 3px;box-shadow:inset -6px 0 8px -8px rgba(0, 0, 0, 0.25);margin-top:1px}table.svelte-wk1571 td.new-month.svelte-wk1571{box-shadow:none}table.svelte-wk1571 .headings.svelte-wk1571{background-color:#990099 !important;color:#FFF}table.svelte-wk1571 .month-summary.svelte-wk1571{background-color:#ffccff !important;font-weight:700;text-align:right}table.svelte-wk1571 .balance-reset.svelte-wk1571{color:#FFF !important;background-color:#050 !important}table.svelte-wk1571 .balance-negative.svelte-wk1571{background-color:#FF0000 !important;color:#FFF !important;font-weight:700}table.svelte-wk1571 .balance-low.svelte-wk1571{background-color:#EEAA00 !important;color:#FFF;font-weight:700}table.svelte-wk1571 .balance-uncomfortable.svelte-wk1571{color:#AA9900;font-weight:700}table.svelte-wk1571 .balance-goal.svelte-wk1571{color:#FFF;background-color:#009900 !important;font-weight:700}table.svelte-wk1571 .new-month.svelte-wk1571{font-weight:700;font-size:1.25rem;padding-top:1rem;background-color:#fff !important}table.svelte-wk1571 tbody tr.svelte-wk1571:nth-child(odd){background-color:#ccffcc}.entry-modal.svelte-wk1571.svelte-wk1571{position:absolute;margin:0 auto;top:-1000px;width:75%;left:12.5%;background:#fff;border-radius:1rem;padding:0.5rem;box-shadow:0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.75)}",
  map: `{"version":3,"file":"ForecastTable.svelte","sources":["ForecastTable.svelte"],"sourcesContent":["<script>\\r\\n\\timport { appStateStore, rawEntriesStore } from '../scripts/stores';\\r\\n\\timport { updateEntry } from '../scripts/parseEntries';\\r\\n    import { onMount } from 'svelte';\\r\\n    import { fmt } from '../scripts/fmt';\\r\\n\\r\\n    export let parsedEntries = [];\\r\\n\\r\\n\\t$: entryCount = parsedEntries.length;\\r\\n\\r\\n\\tlet entryInputs = {};\\r\\n\\r\\n\\tlet startMonthIndex = 0;\\r\\n\\r\\n\\tlet showEntryEdit = null;\\r\\n\\r\\n\\tconst isNewMonth = (date1, date2) => {\\r\\n\\t\\treturn date1.getMonth() != date2.getMonth(); \\r\\n\\t}\\r\\n\\r\\n    onMount(async () => {\\r\\n\\t\\t$appStateStore.showLoader = false;\\r\\n\\t});\\r\\n\\t\\r\\n\\tconst showMonthHeader = (i) => {\\r\\n\\t\\tlet showHeader = false;\\r\\n\\t\\tif (i > 0 && isNewMonth(parsedEntries[i].date, parsedEntries[i - 1].date)) {\\r\\n\\t\\t\\tshowHeader = true;\\r\\n\\t\\t} else if (i === 0) {\\r\\n\\t\\t\\tshowHeader = true;\\r\\n\\t\\t}\\r\\n\\t\\tif (showHeader) {\\r\\n\\t\\t\\tstartMonthIndex = i;\\r\\n\\t\\t}\\r\\n\\t\\treturn showHeader;\\r\\n\\t}\\r\\n\\t\\r\\n\\tconst showMonthFooter = (i) => {\\r\\n\\t\\tlet showFooter = false;\\r\\n\\t\\tconst entry = parsedEntries[i];\\r\\n\\t\\tif (i >= 0 && i < (entryCount - 1) && isNewMonth(entry.date, parsedEntries[i + 1].date)) {\\r\\n\\t\\t\\tshowFooter = true;\\r\\n\\t\\t} else if (i === (entryCount - 1)) {\\r\\n\\t\\t\\tshowFooter = true;\\r\\n\\t\\t}\\r\\n\\t\\treturn showFooter;\\r\\n\\t}\\r\\n\\r\\n\\tconst monthSummary = (i) => {\\r\\n\\t\\tlet summaryCredit = 0;\\r\\n\\t\\tlet summaryDebit = 0;\\r\\n\\t\\tlet summaryNet = 0;\\r\\n\\t\\tparsedEntries.slice(startMonthIndex, i + 1).forEach(entry => {\\r\\n\\t\\t\\tif (entry.type === 'C') {\\r\\n\\t\\t\\t\\tsummaryCredit += +entry.amount;\\r\\n\\t\\t\\t\\tsummaryNet += +entry.amount;\\r\\n\\t\\t\\t} else if (entry.type === 'D') {\\r\\n\\t\\t\\t\\tsummaryDebit += +entry.amount;\\r\\n\\t\\t\\t\\tsummaryNet -= +entry.amount;\\r\\n\\t\\t\\t}\\r\\n\\t\\t});\\r\\n\\t\\treturn [fmt.curr(summaryCredit), fmt.curr(summaryDebit), 'NET ' + fmt.curr(summaryNet)];\\r\\n\\t}\\r\\n\\r\\n\\tfunction clickEntry(e, entry, i) {\\r\\n\\t\\tif (showEntryEdit === null) {\\r\\n\\t\\t\\t// document.querySelector('.entry-modal').style.top = e.layerY + 'px';\\r\\n\\t\\t\\tentryInputs = {...entry};\\r\\n\\t\\t\\tentryInputs.date = fmt.date3(entryInputs.date);\\r\\n\\t\\t\\tentryInputs.amount = +entryInputs.amount;\\r\\n\\t\\t\\tconsole.log('clickEntry', e, entry);\\r\\n\\t\\t\\tshowEntryEdit = i;\\r\\n\\t\\t}\\r\\n\\t}\\r\\n\\r\\n\\tfunction saveEntry(e, entry, i) {\\r\\n\\t\\te.stopPropagation();\\r\\n\\t\\tshowEntryEdit = null;\\r\\n\\t\\t$rawEntriesStore = updateEntry($rawEntriesStore, entry, entryInputs);\\r\\n\\t\\tlocalStorage.setItem('rawEntries', $rawEntriesStore);\\r\\n\\t}\\r\\n\\r\\n\\tfunction cancelEntry(e) {\\r\\n\\t\\te.stopPropagation();\\r\\n\\t\\tshowEntryEdit = null;\\r\\n\\t}\\r\\n\\r\\n<\/script>\\r\\n\\r\\n<table>\\r\\n    <tbody>\\r\\n        {#each parsedEntries as entry, i}\\r\\n            {#if showMonthHeader(i)}\\r\\n                <tr>\\r\\n                    <td class=\\"new-month\\" colspan=5>{fmt.date2(entry.date)}</td>\\r\\n                </tr>\\r\\n\\t\\t\\t\\t<tr class=\\"headings\\">\\r\\n\\t\\t\\t\\t\\t<td>Date</td>\\r\\n\\t\\t\\t\\t\\t<td>Description</td>\\r\\n\\t\\t\\t\\t\\t<td>Credit</td>\\r\\n\\t\\t\\t\\t\\t<td>Debit</td>\\r\\n\\t\\t\\t\\t\\t<td>Balance</td>\\r\\n\\t\\t\\t\\t</tr>\\r\\n\\t\\t\\t{/if}\\r\\n            <tr class:balance-reset=\\"{entry.type === 'B'}\\" class=\\"balance-{entry.flag}\\" on:click={(e) => { clickEntry(e, entry, i); }}>\\r\\n\\t\\t\\t\\t{#if showEntryEdit === i}\\r\\n\\t\\t\\t\\t\\t<td>\\r\\n\\t\\t\\t\\t\\t\\t<input type=\\"date\\" bind:value={entryInputs.date}>\\r\\n\\t\\t\\t\\t\\t</td>\\r\\n\\t\\t\\t\\t\\t<td>\\r\\n\\t\\t\\t\\t\\t\\t<textarea bind:value={entryInputs.desc}></textarea>\\r\\n\\t\\t\\t\\t\\t</td>\\r\\n\\t\\t\\t\\t\\t<td colspan=\\"2\\">\\r\\n\\t\\t\\t\\t\\t\\t<select bind:value={entryInputs.type} disabled=\\"{entryInputs.type === 'B'}\\">\\r\\n\\t\\t\\t\\t\\t\\t\\t<option value=\\"B\\" disabled>Balance</option>\\r\\n\\t\\t\\t\\t\\t\\t\\t<option value=\\"C\\">Credit</option>\\r\\n\\t\\t\\t\\t\\t\\t\\t<option value=\\"D\\">Debit</option>\\r\\n\\t\\t\\t\\t\\t\\t</select>\\r\\n\\t\\t\\t\\t\\t\\t \\r\\n\\t\\t\\t\\t\\t\\t<input type=\\"number\\" bind:value={entryInputs.amount}>\\r\\n\\t\\t\\t\\t\\t</td>\\r\\n\\t\\t\\t\\t\\t<td>\\r\\n\\t\\t\\t\\t\\t\\t<button on:click={(e) => { cancelEntry(e); }}>CANCEL</button>\\r\\n\\t\\t\\t\\t\\t\\t \\r\\n\\t\\t\\t\\t\\t\\t<button on:click={(e) => { saveEntry(e, entry, i); }}>SAVE</button>\\r\\n\\t\\t\\t\\t\\t</td>\\r\\n\\t\\t\\t\\t{:else}\\r\\n\\t\\t\\t\\t\\t<td>{entry.formattedDate}</td>\\r\\n\\t\\t\\t\\t\\t<td align=\\"left\\">{entry.desc}</td>\\r\\n\\t\\t\\t\\t\\t<td align=\\"right\\">{entry.formattedCredit}</td>\\r\\n\\t\\t\\t\\t\\t<td align=\\"right\\">{entry.formattedDebit}</td>\\r\\n\\t\\t\\t\\t\\t<td align=\\"right\\">{entry.formattedBalance}</td>\\r\\n\\t\\t\\t\\t{/if}\\r\\n\\r\\n            </tr>\\r\\n            {#if showMonthFooter(i)}\\r\\n\\t\\t\\t\\t<tr class=\\"month-summary\\">\\r\\n\\t\\t\\t\\t\\t<td colspan=\\"2\\">Summary</td>\\r\\n\\t\\t\\t\\t\\t{#each monthSummary(i) as summary}\\r\\n\\t\\t\\t\\t\\t\\t<td>{summary}</td>\\r\\n\\t\\t\\t\\t\\t{/each}\\r\\n\\t\\t\\t\\t</tr>\\r\\n\\t\\t\\t{/if}\\r\\n        {/each}\\r\\n    </tbody>\\r\\n</table>\\r\\n\\r\\n<style lang=\\"scss\\">table {\\n  width: calc(100% - 2rem);\\n  margin: 0 0.125rem;\\n  font-family: monospace;\\n  font-size: 0.75rem;\\n  transform: opacity 2s;\\n}\\ntable td {\\n  padding: 0 3px;\\n  box-shadow: inset -6px 0 8px -8px rgba(0, 0, 0, 0.25);\\n  margin-top: 1px;\\n}\\ntable td.new-month {\\n  box-shadow: none;\\n}\\ntable .headings {\\n  background-color: #990099 !important;\\n  color: #FFF;\\n}\\ntable .month-summary {\\n  background-color: #ffccff !important;\\n  font-weight: 700;\\n  text-align: right;\\n}\\ntable .balance-reset {\\n  color: #FFF !important;\\n  background-color: #050 !important;\\n}\\ntable .balance-negative {\\n  background-color: #FF0000 !important;\\n  color: #FFF !important;\\n  font-weight: 700;\\n}\\ntable .balance-low {\\n  background-color: #EEAA00 !important;\\n  color: #FFF;\\n  font-weight: 700;\\n}\\ntable .balance-uncomfortable {\\n  color: #AA9900;\\n  font-weight: 700;\\n}\\ntable .balance-goal {\\n  color: #FFF;\\n  background-color: #009900 !important;\\n  font-weight: 700;\\n}\\ntable .new-month {\\n  font-weight: 700;\\n  font-size: 1.25rem;\\n  padding-top: 1rem;\\n  background-color: #fff !important;\\n}\\ntable tbody tr:nth-child(odd) {\\n  background-color: #ccffcc;\\n}\\n\\n.entry-modal {\\n  position: absolute;\\n  margin: 0 auto;\\n  top: -1000px;\\n  width: 75%;\\n  left: 12.5%;\\n  background: #fff;\\n  border-radius: 1rem;\\n  padding: 0.5rem;\\n  box-shadow: 0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.75);\\n}</style>"],"names":[],"mappings":"AAmJmB,KAAK,4BAAC,CAAC,AACxB,KAAK,CAAE,KAAK,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,CACxB,MAAM,CAAE,CAAC,CAAC,QAAQ,CAClB,WAAW,CAAE,SAAS,CACtB,SAAS,CAAE,OAAO,CAClB,SAAS,CAAE,OAAO,CAAC,EAAE,AACvB,CAAC,AACD,mBAAK,CAAC,EAAE,cAAC,CAAC,AACR,OAAO,CAAE,CAAC,CAAC,GAAG,CACd,UAAU,CAAE,KAAK,CAAC,IAAI,CAAC,CAAC,CAAC,GAAG,CAAC,IAAI,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CACrD,UAAU,CAAE,GAAG,AACjB,CAAC,AACD,mBAAK,CAAC,EAAE,UAAU,cAAC,CAAC,AAClB,UAAU,CAAE,IAAI,AAClB,CAAC,AACD,mBAAK,CAAC,SAAS,cAAC,CAAC,AACf,gBAAgB,CAAE,OAAO,CAAC,UAAU,CACpC,KAAK,CAAE,IAAI,AACb,CAAC,AACD,mBAAK,CAAC,cAAc,cAAC,CAAC,AACpB,gBAAgB,CAAE,OAAO,CAAC,UAAU,CACpC,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,KAAK,AACnB,CAAC,AACD,mBAAK,CAAC,cAAc,cAAC,CAAC,AACpB,KAAK,CAAE,IAAI,CAAC,UAAU,CACtB,gBAAgB,CAAE,IAAI,CAAC,UAAU,AACnC,CAAC,AACD,mBAAK,CAAC,iBAAiB,cAAC,CAAC,AACvB,gBAAgB,CAAE,OAAO,CAAC,UAAU,CACpC,KAAK,CAAE,IAAI,CAAC,UAAU,CACtB,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,mBAAK,CAAC,YAAY,cAAC,CAAC,AAClB,gBAAgB,CAAE,OAAO,CAAC,UAAU,CACpC,KAAK,CAAE,IAAI,CACX,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,mBAAK,CAAC,sBAAsB,cAAC,CAAC,AAC5B,KAAK,CAAE,OAAO,CACd,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,mBAAK,CAAC,aAAa,cAAC,CAAC,AACnB,KAAK,CAAE,IAAI,CACX,gBAAgB,CAAE,OAAO,CAAC,UAAU,CACpC,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,mBAAK,CAAC,UAAU,cAAC,CAAC,AAChB,WAAW,CAAE,GAAG,CAChB,SAAS,CAAE,OAAO,CAClB,WAAW,CAAE,IAAI,CACjB,gBAAgB,CAAE,IAAI,CAAC,UAAU,AACnC,CAAC,AACD,mBAAK,CAAC,KAAK,CAAC,gBAAE,WAAW,GAAG,CAAC,AAAC,CAAC,AAC7B,gBAAgB,CAAE,OAAO,AAC3B,CAAC,AAED,YAAY,4BAAC,CAAC,AACZ,QAAQ,CAAE,QAAQ,CAClB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,GAAG,CAAE,OAAO,CACZ,KAAK,CAAE,GAAG,CACV,IAAI,CAAE,KAAK,CACX,UAAU,CAAE,IAAI,CAChB,aAAa,CAAE,IAAI,CACnB,OAAO,CAAE,MAAM,CACf,UAAU,CAAE,OAAO,CAAC,OAAO,CAAC,MAAM,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,AACxD,CAAC"}`
};
const ForecastTable = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let entryCount;
  let $$unsubscribe_rawEntriesStore;
  let $$unsubscribe_appStateStore;
  $$unsubscribe_rawEntriesStore = subscribe(rawEntriesStore, (value) => value);
  $$unsubscribe_appStateStore = subscribe(appStateStore, (value) => value);
  let { parsedEntries = [] } = $$props;
  let entryInputs = {};
  let startMonthIndex = 0;
  let showEntryEdit = null;
  const isNewMonth = (date1, date2) => {
    return date1.getMonth() != date2.getMonth();
  };
  const showMonthHeader = (i) => {
    let showHeader = false;
    if (i > 0 && isNewMonth(parsedEntries[i].date, parsedEntries[i - 1].date)) {
      showHeader = true;
    } else if (i === 0) {
      showHeader = true;
    }
    if (showHeader) {
      startMonthIndex = i;
    }
    return showHeader;
  };
  const showMonthFooter = (i) => {
    let showFooter = false;
    const entry = parsedEntries[i];
    if (i >= 0 && i < entryCount - 1 && isNewMonth(entry.date, parsedEntries[i + 1].date)) {
      showFooter = true;
    } else if (i === entryCount - 1) {
      showFooter = true;
    }
    return showFooter;
  };
  const monthSummary = (i) => {
    let summaryCredit = 0;
    let summaryDebit = 0;
    let summaryNet = 0;
    parsedEntries.slice(startMonthIndex, i + 1).forEach((entry) => {
      if (entry.type === "C") {
        summaryCredit += +entry.amount;
        summaryNet += +entry.amount;
      } else if (entry.type === "D") {
        summaryDebit += +entry.amount;
        summaryNet -= +entry.amount;
      }
    });
    return [
      fmt.curr(summaryCredit),
      fmt.curr(summaryDebit),
      "NET " + fmt.curr(summaryNet)
    ];
  };
  if ($$props.parsedEntries === void 0 && $$bindings.parsedEntries && parsedEntries !== void 0)
    $$bindings.parsedEntries(parsedEntries);
  $$result.css.add(css$5);
  entryCount = parsedEntries.length;
  $$unsubscribe_rawEntriesStore();
  $$unsubscribe_appStateStore();
  return `<table class="${"svelte-wk1571"}"><tbody>${each(parsedEntries, (entry, i) => `${showMonthHeader(i) ? `<tr class="${"svelte-wk1571"}"><td class="${"new-month svelte-wk1571"}" colspan="${"5"}">${escape(fmt.date2(entry.date))}</td></tr>
				<tr class="${"headings svelte-wk1571"}"><td class="${"svelte-wk1571"}">Date</td>
					<td class="${"svelte-wk1571"}">Description</td>
					<td class="${"svelte-wk1571"}">Credit</td>
					<td class="${"svelte-wk1571"}">Debit</td>
					<td class="${"svelte-wk1571"}">Balance</td>
				</tr>` : ``}
            <tr class="${[
    "balance-" + escape(entry.flag) + " svelte-wk1571",
    entry.type === "B" ? "balance-reset" : ""
  ].join(" ").trim()}">${showEntryEdit === i ? `<td class="${"svelte-wk1571"}"><input type="${"date"}"${add_attribute("value", entryInputs.date, 0)}></td>
					<td class="${"svelte-wk1571"}"><textarea>${""}</textarea></td>
					<td colspan="${"2"}" class="${"svelte-wk1571"}"><select ${""}><option value="${"B"}" disabled>Balance</option><option value="${"C"}">Credit</option><option value="${"D"}">Debit</option></select>
						 
						<input type="${"number"}"${add_attribute("value", entryInputs.amount, 0)}></td>
					<td class="${"svelte-wk1571"}"><button>CANCEL</button>
						 
						<button>SAVE</button>
					</td>` : `<td class="${"svelte-wk1571"}">${escape(entry.formattedDate)}</td>
					<td align="${"left"}" class="${"svelte-wk1571"}">${escape(entry.desc)}</td>
					<td align="${"right"}" class="${"svelte-wk1571"}">${escape(entry.formattedCredit)}</td>
					<td align="${"right"}" class="${"svelte-wk1571"}">${escape(entry.formattedDebit)}</td>
					<td align="${"right"}" class="${"svelte-wk1571"}">${escape(entry.formattedBalance)}</td>`}</tr>
            ${showMonthFooter(i) ? `<tr class="${"month-summary svelte-wk1571"}"><td colspan="${"2"}" class="${"svelte-wk1571"}">Summary</td>
					${each(monthSummary(i), (summary) => `<td class="${"svelte-wk1571"}">${escape(summary)}</td>`)}
				</tr>` : ``}`)}</tbody>
</table>`;
});
var COMMON_MIME_TYPES = new Map([
  ["avi", "video/avi"],
  ["gif", "image/gif"],
  ["ico", "image/x-icon"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["mkv", "video/x-matroska"],
  ["mov", "video/quicktime"],
  ["mp4", "video/mp4"],
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["zip", "application/zip"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
]);
function toFileWithPath(file, path) {
  var f = withMimeType(file);
  if (typeof f.path !== "string") {
    var webkitRelativePath = file.webkitRelativePath;
    Object.defineProperty(f, "path", {
      value: typeof path === "string" ? path : typeof webkitRelativePath === "string" && webkitRelativePath.length > 0 ? webkitRelativePath : file.name,
      writable: false,
      configurable: false,
      enumerable: true
    });
  }
  return f;
}
function withMimeType(file) {
  var name = file.name;
  var hasExtension = name && name.lastIndexOf(".") !== -1;
  if (hasExtension && !file.type) {
    var ext = name.split(".").pop().toLowerCase();
    var type = COMMON_MIME_TYPES.get(ext);
    if (type) {
      Object.defineProperty(file, "type", {
        value: type,
        writable: false,
        configurable: false,
        enumerable: true
      });
    }
  }
  return file;
}
var FILES_TO_IGNORE = [
  ".DS_Store",
  "Thumbs.db"
];
function fromEvent(evt) {
  return __awaiter(this, void 0, void 0, function() {
    return __generator(this, function(_a) {
      return [2, isDragEvt(evt) && evt.dataTransfer ? getDataTransferFiles(evt.dataTransfer, evt.type) : getInputFiles(evt)];
    });
  });
}
function isDragEvt(value) {
  return !!value.dataTransfer;
}
function getInputFiles(evt) {
  var files = isInput(evt.target) ? evt.target.files ? fromList(evt.target.files) : [] : [];
  return files.map(function(file) {
    return toFileWithPath(file);
  });
}
function isInput(value) {
  return value !== null;
}
function getDataTransferFiles(dt, type) {
  return __awaiter(this, void 0, void 0, function() {
    var items, files;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          if (!dt.items)
            return [3, 2];
          items = fromList(dt.items).filter(function(item) {
            return item.kind === "file";
          });
          if (type !== "drop") {
            return [2, items];
          }
          return [4, Promise.all(items.map(toFilePromises))];
        case 1:
          files = _a.sent();
          return [2, noIgnoredFiles(flatten(files))];
        case 2:
          return [2, noIgnoredFiles(fromList(dt.files).map(function(file) {
            return toFileWithPath(file);
          }))];
      }
    });
  });
}
function noIgnoredFiles(files) {
  return files.filter(function(file) {
    return FILES_TO_IGNORE.indexOf(file.name) === -1;
  });
}
function fromList(items) {
  var files = [];
  for (var i = 0; i < items.length; i++) {
    var file = items[i];
    files.push(file);
  }
  return files;
}
function toFilePromises(item) {
  if (typeof item.webkitGetAsEntry !== "function") {
    return fromDataTransferItem(item);
  }
  var entry = item.webkitGetAsEntry();
  if (entry && entry.isDirectory) {
    return fromDirEntry(entry);
  }
  return fromDataTransferItem(item);
}
function flatten(items) {
  return items.reduce(function(acc, files) {
    return __spread(acc, Array.isArray(files) ? flatten(files) : [files]);
  }, []);
}
function fromDataTransferItem(item) {
  var file = item.getAsFile();
  if (!file) {
    return Promise.reject(item + " is not a File");
  }
  var fwp = toFileWithPath(file);
  return Promise.resolve(fwp);
}
function fromEntry(entry) {
  return __awaiter(this, void 0, void 0, function() {
    return __generator(this, function(_a) {
      return [2, entry.isDirectory ? fromDirEntry(entry) : fromFileEntry(entry)];
    });
  });
}
function fromDirEntry(entry) {
  var reader = entry.createReader();
  return new Promise(function(resolve2, reject) {
    var entries = [];
    function readEntries() {
      var _this = this;
      reader.readEntries(function(batch) {
        return __awaiter(_this, void 0, void 0, function() {
          var files, err_1, items;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                if (!!batch.length)
                  return [3, 5];
                _a.label = 1;
              case 1:
                _a.trys.push([1, 3, , 4]);
                return [4, Promise.all(entries)];
              case 2:
                files = _a.sent();
                resolve2(files);
                return [3, 4];
              case 3:
                err_1 = _a.sent();
                reject(err_1);
                return [3, 4];
              case 4:
                return [3, 6];
              case 5:
                items = Promise.all(batch.map(fromEntry));
                entries.push(items);
                readEntries();
                _a.label = 6;
              case 6:
                return [2];
            }
          });
        });
      }, function(err) {
        reject(err);
      });
    }
    readEntries();
  });
}
function fromFileEntry(entry) {
  return __awaiter(this, void 0, void 0, function() {
    return __generator(this, function(_a) {
      return [2, new Promise(function(resolve2, reject) {
        entry.file(function(file) {
          var fwp = toFileWithPath(file, entry.fullPath);
          resolve2(fwp);
        }, function(err) {
          reject(err);
        });
      })];
    });
  });
}
function onDocumentDragOver(event) {
  event.preventDefault();
}
var Dropzone_svelte_svelte_type_style_lang = "";
const css$4 = {
  code: ".dropzone.svelte-817dg2{flex:1;display:flex;flex-direction:column;align-items:center;padding:20px;border-width:2px;border-radius:2px;border-color:#eeeeee;border-style:dashed;background-color:#fafafa;color:#bdbdbd;outline:none;transition:border 0.24s ease-in-out}.dropzone.svelte-817dg2:focus{border-color:#2196f3}",
  map: `{"version":3,"file":"Dropzone.svelte","sources":["Dropzone.svelte"],"sourcesContent":["<script>\\r\\n  import { fromEvent } from \\"file-selector\\";\\r\\n  import {\\r\\n    allFilesAccepted,\\r\\n    composeEventHandlers,\\r\\n    fileAccepted,\\r\\n    fileMatchSize,\\r\\n    isEvtWithFiles,\\r\\n    isIeOrEdge,\\r\\n    isPropagationStopped,\\r\\n    onDocumentDragOver,\\r\\n    TOO_MANY_FILES_REJECTION\\r\\n  } from \\"./../utils/index\\";\\r\\n  import { onMount, onDestroy, createEventDispatcher } from \\"svelte\\";\\r\\n\\r\\n  //props\\r\\n  /**\\r\\n   * Set accepted file types.\\r\\n   * See https://github.com/okonet/attr-accept for more information.\\r\\n   */\\r\\n  export let accept; // string or string[]\\r\\n  export let disabled = false;\\r\\n  export let getFilesFromEvent = fromEvent;\\r\\n  export let maxSize = Infinity;\\r\\n  export let minSize = 0;\\r\\n  export let multiple = true;\\r\\n  export let preventDropOnDocument = true;\\r\\n  export let noClick = false;\\r\\n  export let noKeyboard = false;\\r\\n  export let noDrag = false;\\r\\n  export let noDragEventsBubbling = false;\\r\\n  export let containerClasses = \\"\\";\\r\\n  export let containerStyles = \\"\\";\\r\\n  export let disableDefaultStyles = false;\\r\\n\\r\\n  const dispatch = createEventDispatcher();\\r\\n\\r\\n  //state\\r\\n\\r\\n  let state = {\\r\\n    isFocused: false,\\r\\n    isFileDialogActive: false,\\r\\n    isDragActive: false,\\r\\n    isDragAccept: false,\\r\\n    isDragReject: false,\\r\\n    draggedFiles: [],\\r\\n    acceptedFiles: [],\\r\\n    fileRejections: []\\r\\n  };\\r\\n\\r\\n  let rootRef;\\r\\n  let inputRef;\\r\\n\\r\\n  function resetState() {\\r\\n    state.isFileDialogActive = false;\\r\\n    state.isDragActive = false;\\r\\n    state.draggedFiles = [];\\r\\n    state.acceptedFiles = [];\\r\\n    state.fileRejections = [];\\r\\n  }\\r\\n\\r\\n  // Fn for opening the file dialog programmatically\\r\\n  function openFileDialog() {\\r\\n    if (inputRef) {\\r\\n      inputRef.value = null; // TODO check if null needs to be set\\r\\n      state.isFileDialogActive = true;\\r\\n      inputRef.click();\\r\\n    }\\r\\n  }\\r\\n\\r\\n  // Cb to open the file dialog when SPACE/ENTER occurs on the dropzone\\r\\n  function onKeyDownCb(event) {\\r\\n    // Ignore keyboard events bubbling up the DOM tree\\r\\n    if (!rootRef || !rootRef.isEqualNode(event.target)) {\\r\\n      return;\\r\\n    }\\r\\n\\r\\n    if (event.keyCode === 32 || event.keyCode === 13) {\\r\\n      event.preventDefault();\\r\\n      openFileDialog();\\r\\n    }\\r\\n  }\\r\\n\\r\\n  // Update focus state for the dropzone\\r\\n  function onFocusCb() {\\r\\n    state.isFocused = true;\\r\\n  }\\r\\n  function onBlurCb() {\\r\\n    state.isFocused = false;\\r\\n  }\\r\\n\\r\\n  // Cb to open the file dialog when click occurs on the dropzone\\r\\n  function onClickCb() {\\r\\n    if (noClick) {\\r\\n      return;\\r\\n    }\\r\\n\\r\\n    // In IE11/Edge the file-browser dialog is blocking, therefore, use setTimeout()\\r\\n    // to ensure React can handle state changes\\r\\n    // See: https://github.com/react-dropzone/react-dropzone/issues/450\\r\\n    if (isIeOrEdge()) {\\r\\n      setTimeout(openFileDialog, 0);\\r\\n    } else {\\r\\n      openFileDialog();\\r\\n    }\\r\\n  }\\r\\n\\r\\n  function onDragEnterCb(event) {\\r\\n    event.preventDefault();\\r\\n    stopPropagation(event);\\r\\n\\r\\n    dragTargetsRef = [...dragTargetsRef, event.target];\\r\\n\\r\\n    if (isEvtWithFiles(event)) {\\r\\n      Promise.resolve(getFilesFromEvent(event)).then(draggedFiles => {\\r\\n        if (isPropagationStopped(event) && !noDragEventsBubbling) {\\r\\n          return;\\r\\n        }\\r\\n\\r\\n        state.draggedFiles = draggedFiles;\\r\\n        state.isDragActive = true;\\r\\n\\r\\n        dispatch(\\"dragenter\\", {\\r\\n          dragEvent: event\\r\\n        });\\r\\n      });\\r\\n    }\\r\\n  }\\r\\n\\r\\n  function onDragOverCb(event) {\\r\\n    event.preventDefault();\\r\\n    stopPropagation(event);\\r\\n\\r\\n    if (event.dataTransfer) {\\r\\n      try {\\r\\n        event.dataTransfer.dropEffect = \\"copy\\";\\r\\n      } catch {} /* eslint-disable-line no-empty */\\r\\n    }\\r\\n\\r\\n    if (isEvtWithFiles(event)) {\\r\\n      dispatch(\\"dragover\\", {\\r\\n        dragEvent: event\\r\\n      });\\r\\n    }\\r\\n\\r\\n    return false;\\r\\n  }\\r\\n\\r\\n  function onDragLeaveCb(event) {\\r\\n    event.preventDefault();\\r\\n    stopPropagation(event);\\r\\n\\r\\n    // Only deactivate once the dropzone and all children have been left\\r\\n    const targets = dragTargetsRef.filter(\\r\\n      target => rootRef && rootRef.contains(target)\\r\\n    );\\r\\n    // Make sure to remove a target present multiple times only once\\r\\n    // (Firefox may fire dragenter/dragleave multiple times on the same element)\\r\\n    const targetIdx = targets.indexOf(event.target);\\r\\n    if (targetIdx !== -1) {\\r\\n      targets.splice(targetIdx, 1);\\r\\n    }\\r\\n    dragTargetsRef = targets;\\r\\n    if (targets.length > 0) {\\r\\n      return;\\r\\n    }\\r\\n\\r\\n    state.isDragActive = false;\\r\\n    state.draggedFiles = [];\\r\\n\\r\\n    if (isEvtWithFiles(event)) {\\r\\n      dispatch(\\"dragleave\\", {\\r\\n        dragEvent: event\\r\\n      });\\r\\n    }\\r\\n  }\\r\\n\\r\\n  function onDropCb(event) {\\r\\n    event.preventDefault();\\r\\n    stopPropagation(event);\\r\\n\\r\\n    dragTargetsRef = [];\\r\\n\\r\\n    if (isEvtWithFiles(event)) {\\r\\n      Promise.resolve(getFilesFromEvent(event)).then(files => {\\r\\n        if (isPropagationStopped(event) && !noDragEventsBubbling) {\\r\\n          return;\\r\\n        }\\r\\n\\r\\n        const acceptedFiles = [];\\r\\n        const fileRejections = [];\\r\\n\\r\\n        files.forEach(file => {\\r\\n          const [accepted, acceptError] = fileAccepted(file, accept);\\r\\n          const [sizeMatch, sizeError] = fileMatchSize(file, minSize, maxSize);\\r\\n          if (accepted && sizeMatch) {\\r\\n            acceptedFiles.push(file);\\r\\n          } else {\\r\\n            const errors = [acceptError, sizeError].filter(e => e);\\r\\n            fileRejections.push({ file, errors });\\r\\n          }\\r\\n        });\\r\\n\\r\\n        if (!multiple && acceptedFiles.length > 1) {\\r\\n          // Reject everything and empty accepted files\\r\\n          acceptedFiles.forEach(file => {\\r\\n            fileRejections.push({ file, errors: [TOO_MANY_FILES_REJECTION] });\\r\\n          });\\r\\n          acceptedFiles.splice(0);\\r\\n        }\\r\\n\\r\\n        state.acceptedFiles = acceptedFiles;\\r\\n        state.fileRejections = fileRejections;\\r\\n\\r\\n        dispatch(\\"drop\\", {\\r\\n          acceptedFiles,\\r\\n          fileRejections,\\r\\n          event\\r\\n        });\\r\\n\\r\\n        if (fileRejections.length > 0) {\\r\\n          dispatch(\\"droprejected\\", {\\r\\n            fileRejections,\\r\\n            event\\r\\n          });\\r\\n        }\\r\\n\\r\\n        if (acceptedFiles.length > 0) {\\r\\n          dispatch(\\"dropaccepted\\", {\\r\\n            acceptedFiles,\\r\\n            event\\r\\n          });\\r\\n        }\\r\\n      });\\r\\n    }\\r\\n    resetState();\\r\\n  }\\r\\n\\r\\n  function composeHandler(fn) {\\r\\n    return disabled ? null : fn;\\r\\n  }\\r\\n\\r\\n  function composeKeyboardHandler(fn) {\\r\\n    return noKeyboard ? null : composeHandler(fn);\\r\\n  }\\r\\n\\r\\n  function composeDragHandler(fn) {\\r\\n    return noDrag ? null : composeHandler(fn);\\r\\n  }\\r\\n\\r\\n  function stopPropagation(event) {\\r\\n    if (noDragEventsBubbling) {\\r\\n      event.stopPropagation();\\r\\n    }\\r\\n  }\\r\\n\\r\\n  let dragTargetsRef = [];\\r\\n  function onDocumentDrop(event) {\\r\\n    if (rootRef && rootRef.contains(event.target)) {\\r\\n      // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler\\r\\n      return;\\r\\n    }\\r\\n    event.preventDefault();\\r\\n    dragTargetsRef = [];\\r\\n  }\\r\\n\\r\\n  // Update file dialog active state when the window is focused on\\r\\n  function onWindowFocus() {\\r\\n    // Execute the timeout only if the file dialog is opened in the browser\\r\\n    if (state.isFileDialogActive) {\\r\\n      setTimeout(() => {\\r\\n        if (inputRef) {\\r\\n          const { files } = inputRef;\\r\\n\\r\\n          if (!files.length) {\\r\\n            state.isFileDialogActive = false;\\r\\n            dispatch(\\"filedialogcancel\\");\\r\\n          }\\r\\n        }\\r\\n      }, 300);\\r\\n    }\\r\\n  }\\r\\n\\r\\n  onMount(() => {\\r\\n    window.addEventListener(\\"focus\\", onWindowFocus, false);\\r\\n    if (preventDropOnDocument) {\\r\\n      document.addEventListener(\\"dragover\\", onDocumentDragOver, false);\\r\\n      document.addEventListener(\\"drop\\", onDocumentDrop, false);\\r\\n    }\\r\\n  });\\r\\n\\r\\n  onDestroy(() => {\\r\\n    window.removeEventListener(\\"focus\\", onWindowFocus, false);\\r\\n    if (preventDropOnDocument) {\\r\\n      document.removeEventListener(\\"dragover\\", onDocumentDragOver);\\r\\n      document.removeEventListener(\\"drop\\", onDocumentDrop);\\r\\n    }\\r\\n  });\\r\\n\\r\\n  function onInputElementClick(event) {\\r\\n    event.stopPropagation();\\r\\n  }\\r\\n<\/script>\\r\\n\\r\\n<style>\\r\\n  .dropzone {\\r\\n    flex: 1;\\r\\n    display: flex;\\r\\n    flex-direction: column;\\r\\n    align-items: center;\\r\\n    padding: 20px;\\r\\n    border-width: 2px;\\r\\n    border-radius: 2px;\\r\\n    border-color: #eeeeee;\\r\\n    border-style: dashed;\\r\\n    background-color: #fafafa;\\r\\n    color: #bdbdbd;\\r\\n    outline: none;\\r\\n    transition: border 0.24s ease-in-out;\\r\\n  }\\r\\n  .dropzone:focus {\\r\\n    border-color: #2196f3;\\r\\n  }\\r\\n</style>\\r\\n\\r\\n<div\\r\\n  bind:this={rootRef}\\r\\n  tabindex=\\"0\\"\\r\\n  class=\\"{disableDefaultStyles ? '' : 'dropzone'}\\r\\n  {containerClasses}\\"\\r\\n  style={containerStyles}\\r\\n  on:keydown={composeKeyboardHandler(onKeyDownCb)}\\r\\n  on:focus={composeKeyboardHandler(onFocusCb)}\\r\\n  on:blur={composeKeyboardHandler(onBlurCb)}\\r\\n  on:click={composeHandler(onClickCb)}\\r\\n  on:dragenter={composeDragHandler(onDragEnterCb)}\\r\\n  on:dragover={composeDragHandler(onDragOverCb)}\\r\\n  on:dragleave={composeDragHandler(onDragLeaveCb)}\\r\\n  on:drop={composeDragHandler(onDropCb)}>\\r\\n  <input\\r\\n    {accept}\\r\\n    {multiple}\\r\\n    type=\\"file\\"\\r\\n    autocomplete=\\"off\\"\\r\\n    tabindex=\\"-1\\"\\r\\n    on:change={onDropCb}\\r\\n    on:click={onInputElementClick}\\r\\n    bind:this={inputRef}\\r\\n    style=\\"display: none;\\" />\\r\\n  <slot>\\r\\n    <p>Drag 'n' drop some files here, or click to select files</p>\\r\\n  </slot>\\r\\n</div>\\r\\n"],"names":[],"mappings":"AAiTE,SAAS,cAAC,CAAC,AACT,IAAI,CAAE,CAAC,CACP,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,MAAM,CACnB,OAAO,CAAE,IAAI,CACb,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,CAClB,YAAY,CAAE,OAAO,CACrB,YAAY,CAAE,MAAM,CACpB,gBAAgB,CAAE,OAAO,CACzB,KAAK,CAAE,OAAO,CACd,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,MAAM,CAAC,KAAK,CAAC,WAAW,AACtC,CAAC,AACD,uBAAS,MAAM,AAAC,CAAC,AACf,YAAY,CAAE,OAAO,AACvB,CAAC"}`
};
const Dropzone = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { accept } = $$props;
  let { disabled = false } = $$props;
  let { getFilesFromEvent = fromEvent } = $$props;
  let { maxSize = Infinity } = $$props;
  let { minSize = 0 } = $$props;
  let { multiple = true } = $$props;
  let { preventDropOnDocument = true } = $$props;
  let { noClick = false } = $$props;
  let { noKeyboard = false } = $$props;
  let { noDrag = false } = $$props;
  let { noDragEventsBubbling = false } = $$props;
  let { containerClasses = "" } = $$props;
  let { containerStyles = "" } = $$props;
  let { disableDefaultStyles = false } = $$props;
  createEventDispatcher();
  let rootRef;
  function onDocumentDrop(event) {
    event.preventDefault();
  }
  function onWindowFocus() {
  }
  onDestroy(() => {
    window.removeEventListener("focus", onWindowFocus, false);
    if (preventDropOnDocument) {
      document.removeEventListener("dragover", onDocumentDragOver);
      document.removeEventListener("drop", onDocumentDrop);
    }
  });
  if ($$props.accept === void 0 && $$bindings.accept && accept !== void 0)
    $$bindings.accept(accept);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.getFilesFromEvent === void 0 && $$bindings.getFilesFromEvent && getFilesFromEvent !== void 0)
    $$bindings.getFilesFromEvent(getFilesFromEvent);
  if ($$props.maxSize === void 0 && $$bindings.maxSize && maxSize !== void 0)
    $$bindings.maxSize(maxSize);
  if ($$props.minSize === void 0 && $$bindings.minSize && minSize !== void 0)
    $$bindings.minSize(minSize);
  if ($$props.multiple === void 0 && $$bindings.multiple && multiple !== void 0)
    $$bindings.multiple(multiple);
  if ($$props.preventDropOnDocument === void 0 && $$bindings.preventDropOnDocument && preventDropOnDocument !== void 0)
    $$bindings.preventDropOnDocument(preventDropOnDocument);
  if ($$props.noClick === void 0 && $$bindings.noClick && noClick !== void 0)
    $$bindings.noClick(noClick);
  if ($$props.noKeyboard === void 0 && $$bindings.noKeyboard && noKeyboard !== void 0)
    $$bindings.noKeyboard(noKeyboard);
  if ($$props.noDrag === void 0 && $$bindings.noDrag && noDrag !== void 0)
    $$bindings.noDrag(noDrag);
  if ($$props.noDragEventsBubbling === void 0 && $$bindings.noDragEventsBubbling && noDragEventsBubbling !== void 0)
    $$bindings.noDragEventsBubbling(noDragEventsBubbling);
  if ($$props.containerClasses === void 0 && $$bindings.containerClasses && containerClasses !== void 0)
    $$bindings.containerClasses(containerClasses);
  if ($$props.containerStyles === void 0 && $$bindings.containerStyles && containerStyles !== void 0)
    $$bindings.containerStyles(containerStyles);
  if ($$props.disableDefaultStyles === void 0 && $$bindings.disableDefaultStyles && disableDefaultStyles !== void 0)
    $$bindings.disableDefaultStyles(disableDefaultStyles);
  $$result.css.add(css$4);
  return `<div tabindex="${"0"}" class="${escape(disableDefaultStyles ? "" : "dropzone") + " " + escape(containerClasses) + " svelte-817dg2"}"${add_attribute("style", containerStyles, 0)}${add_attribute("this", rootRef, 0)}><input${add_attribute("accept", accept, 0)} ${multiple ? "multiple" : ""} type="${"file"}" autocomplete="${"off"}" tabindex="${"-1"}" style="${"display: none;"}">
  ${slots.default ? slots.default({}) : `
    <p>Drag &#39;n&#39; drop some files here, or click to select files</p>
  `}</div>`;
});
var Entries_svelte_svelte_type_style_lang = "";
const css$3 = {
  code: "#inputEntries.svelte-1phfc0l{margin-top:0.5rem;border-radius:0.5rem;width:100%;max-width:55em;font-size:1rem;height:90%}",
  map: `{"version":3,"file":"Entries.svelte","sources":["Entries.svelte"],"sourcesContent":["<script>\\r\\n    import { rawEntriesStore } from '../scripts/stores';\\r\\n    import Dropzone from \\"svelte-file-dropzone\\";\\r\\n\\r\\n    let lastInputEntries = '';\\r\\n\\r\\n    function processRaw() {\\r\\n        let inputEntries = document.getElementById('inputEntries').value;\\r\\n        if (lastInputEntries === '') {\\r\\n            lastInputEntries = inputEntries;\\r\\n        } else if (lastInputEntries === inputEntries) {\\r\\n            return;\\r\\n        }\\r\\n        if (inputEntries && inputEntries !== '') {\\r\\n            // cover_shown = true;\\r\\n            setRawEntries(inputEntries);\\r\\n        }\\r\\n\\t}\\r\\n\\r\\n    function setRawEntries(rawEntries) {\\r\\n        $rawEntriesStore = rawEntries;\\r\\n        console.log(\\r\\n            $rawEntriesStore\\r\\n        );\\r\\n        localStorage.setItem('rawEntries', $rawEntriesStore);\\r\\n        lastInputEntries = $rawEntriesStore;\\r\\n    }\\r\\n\\r\\n    function handleFilesSelect(e) {\\r\\n        const { acceptedFiles, fileRejections } = e.detail;\\r\\n\\r\\n        acceptedFiles.forEach(acceptedFile => createFileReader(\\r\\n            acceptedFile, \\r\\n            /^myBalanceForcaster.*\\\\.psv$/, \\r\\n            'Do you want to replace all entries?', \\r\\n            \`This doesn't seem to be a My Balance Forecaster PSV file\`, \\r\\n            setRawEntries\\r\\n        ));\\r\\n    }\\r\\n\\r\\n    function createFileReader(file, fileNameRegex, confirmationMessage, matchErrorMessage, processingCallback) {\\r\\n        const reader = new FileReader();\\r\\n        reader.onload = () => {\\r\\n            const fileData = reader.result;\\r\\n            if (file.name.match(fileNameRegex) && confirm(confirmationMessage)) {\\r\\n                processingCallback(fileData);\\r\\n            } else {\\r\\n                alert(\`\${matchErrorMessage}:\\r\\n\\r\\n    \${file.name}\`);\\r\\n            }\\r\\n        };\\r\\n        reader.readAsText(file);\\r\\n    }\\r\\n\\r\\n<\/script>\\r\\n\\r\\n<!-- <button class=\\"button-action update-forecast\\" on:click={processRaw}>Update Forecast</button> -->\\r\\n<textarea id=\\"inputEntries\\" on:change={processRaw} cols=40 rows=20>{$rawEntriesStore}</textarea>\\r\\n\\r\\n<Dropzone on:drop={handleFilesSelect}/>\\r\\n\\r\\n<style lang=\\"scss\\">#inputEntries {\\n  margin-top: 0.5rem;\\n  border-radius: 0.5rem;\\n  width: 100%;\\n  max-width: 55em;\\n  font-size: 1rem;\\n  height: 90%;\\n}</style>"],"names":[],"mappings":"AA8DmB,aAAa,eAAC,CAAC,AAChC,UAAU,CAAE,MAAM,CAClB,aAAa,CAAE,MAAM,CACrB,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,IAAI,CACf,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,GAAG,AACb,CAAC"}`
};
const Entries = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $rawEntriesStore, $$unsubscribe_rawEntriesStore;
  $$unsubscribe_rawEntriesStore = subscribe(rawEntriesStore, (value) => $rawEntriesStore = value);
  $$result.css.add(css$3);
  $$unsubscribe_rawEntriesStore();
  return `
<textarea id="${"inputEntries"}" cols="${"40"}" rows="${"20"}" class="${"svelte-1phfc0l"}">${escape($rawEntriesStore)}</textarea>

${validate_component(Dropzone, "Dropzone").$$render($$result, {}, {}, {})}`;
});
new Date().toISOString().split("T")[0].replace(/-\d{2}$/, "-");
var Settings_svelte_svelte_type_style_lang = "";
const css$2 = {
  code: ".settings.svelte-zm0b43 label.svelte-zm0b43{display:block;font-weight:bold}.settings.svelte-zm0b43 label.svelte-zm0b43:not(:first-of-type){margin-top:1.5rem}",
  map: `{"version":3,"file":"Settings.svelte","sources":["Settings.svelte"],"sourcesContent":["<script>\\r\\n    import { fmt } from '../scripts/fmt';\\r\\n\\r\\n    import { defaultEntries } from '../scripts/defaultEntries';\\r\\n    import { defaultSettings } from '../scripts/defaultSettings';\\r\\n\\r\\n    const ranges = {\\r\\n        monthsToForecast: { label: 'Months to Forecast', min: 3, max: 24, step: 1 },\\r\\n        thresholdGoalBalance: { label: 'Goal Balance Threshold', min: 1000, max: 20000, step: 500 },\\r\\n        thresholdUncomfortableBalance: { label: 'Uncomfortable Balance Threshold', min: 100, max: 10000, step: 100 },\\r\\n        thresholdLowBalance: { label: 'Low Balance Threshold', min: 100, max: 10000, step: 100 },\\r\\n    };\\r\\n\\r\\n    import { settingsStore, rawEntriesStore } from '../scripts/stores';\\r\\n\\r\\n    function saveSettings(e) {\\r\\n\\t\\tlocalStorage.setItem('settings', JSON.stringify($settingsStore));\\r\\n    }\\r\\n\\r\\n\\tfunction resetEntries() {\\r\\n\\t\\tif (confirm('Are you sure you want to reset the entries and settings? Any customized data will be cleared and the tool will be reset to the default entries.')) {\\r\\n\\t\\t\\tlocalStorage.clear();\\r\\n\\t\\t\\t$rawEntriesStore = defaultEntries;\\r\\n\\t\\t\\t$settingsStore = defaultSettings;\\r\\n\\t\\t}\\r\\n    }\\r\\n\\r\\n    function downloadEntries() {\\r\\n        var element = document.createElement('a');\\r\\n        let fileName = 'myBalanceForcaster-' + fmt.date3() + '-entries.psv';\\r\\n        let fileContent = $rawEntriesStore;\\r\\n        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));\\r\\n        element.setAttribute('download', fileName);\\r\\n\\r\\n        element.style.display = 'none';\\r\\n        document.body.appendChild(element);\\r\\n\\r\\n        element.click();\\r\\n\\r\\n        document.body.removeChild(element);\\r\\n    }\\r\\n\\r\\n<\/script>\\r\\n\\r\\n<div class=\\"settings\\">\\r\\n    {#each Object.entries(ranges) as [key, range]}\\r\\n        <label>\\r\\n            {range.label}:<br>\\r\\n            {$settingsStore[key]} <input type=range min={range.min} max={range.max} step={range.step} on:change={saveSettings} bind:value={$settingsStore[key]}>\\r\\n        </label>\\r\\n    {/each}\\r\\n</div>\\r\\n<button class=\\"button-action\\" on:click={resetEntries}>Reset Entries and Settings</button>\\r\\n<button class=\\"button-action\\" on:click={downloadEntries}>Download Entries</button>\\r\\n\\r\\n<style lang=\\"scss\\">.settings label {\\n  display: block;\\n  font-weight: bold;\\n}\\n.settings label:not(:first-of-type) {\\n  margin-top: 1.5rem;\\n}</style>"],"names":[],"mappings":"AAuDmB,uBAAS,CAAC,KAAK,cAAC,CAAC,AAClC,OAAO,CAAE,KAAK,CACd,WAAW,CAAE,IAAI,AACnB,CAAC,AACD,uBAAS,CAAC,mBAAK,KAAK,cAAc,CAAC,AAAC,CAAC,AACnC,UAAU,CAAE,MAAM,AACpB,CAAC"}`
};
const Settings = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_rawEntriesStore;
  let $settingsStore, $$unsubscribe_settingsStore;
  $$unsubscribe_rawEntriesStore = subscribe(rawEntriesStore, (value) => value);
  $$unsubscribe_settingsStore = subscribe(settingsStore, (value) => $settingsStore = value);
  const ranges = {
    monthsToForecast: {
      label: "Months to Forecast",
      min: 3,
      max: 24,
      step: 1
    },
    thresholdGoalBalance: {
      label: "Goal Balance Threshold",
      min: 1e3,
      max: 2e4,
      step: 500
    },
    thresholdUncomfortableBalance: {
      label: "Uncomfortable Balance Threshold",
      min: 100,
      max: 1e4,
      step: 100
    },
    thresholdLowBalance: {
      label: "Low Balance Threshold",
      min: 100,
      max: 1e4,
      step: 100
    }
  };
  $$result.css.add(css$2);
  $$unsubscribe_rawEntriesStore();
  $$unsubscribe_settingsStore();
  return `<div class="${"settings svelte-zm0b43"}">${each(Object.entries(ranges), ([key, range]) => `<label class="${"svelte-zm0b43"}">${escape(range.label)}:<br>
            ${escape($settingsStore[key])} <input type="${"range"}"${add_attribute("min", range.min, 0)}${add_attribute("max", range.max, 0)}${add_attribute("step", range.step, 0)}${add_attribute("value", $settingsStore[key], 0)}>
        </label>`)}</div>
<button class="${"button-action"}">Reset Entries and Settings</button>
<button class="${"button-action"}">Download Entries</button>`;
});
var ImportedMarkdown_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: ".file-content.svelte-11nwffo{font-size:0.85rem;padding:0.5rem;text-align:left}",
  map: `{"version":3,"file":"ImportedMarkdown.svelte","sources":["ImportedMarkdown.svelte"],"sourcesContent":["<script>\\r\\n    import { onMount } from 'svelte';\\r\\n    import { dev } from '$app/environment';\\r\\n    import marked from 'marked';\\r\\n    \\r\\n    export let filePath;\\r\\n\\r\\n    let fileContent = '';\\r\\n\\r\\n    onMount(async () => {\\r\\n        if (filePath) {\\r\\n            const loadPath = dev ? filePath : filePath.replace('./../../static/', '/');\\r\\n            fetch(loadPath)\\r\\n                .then(response => response.text())\\r\\n                .then(data => {\\r\\n                    fileContent = data;\\r\\n                });\\r\\n\\r\\n        }\\r\\n    });\\r\\n<\/script>\\r\\n\\r\\n<div class=\\"file-content\\">{@html marked(fileContent)}</div>\\r\\n\\r\\n<style lang=\\"scss\\">.file-content {\\n  font-size: 0.85rem;\\n  padding: 0.5rem;\\n  text-align: left;\\n}</style>\\r\\n"],"names":[],"mappings":"AAwBmB,aAAa,eAAC,CAAC,AAChC,SAAS,CAAE,OAAO,CAClB,OAAO,CAAE,MAAM,CACf,UAAU,CAAE,IAAI,AAClB,CAAC"}`
};
const ImportedMarkdown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { filePath } = $$props;
  let fileContent = "";
  if ($$props.filePath === void 0 && $$bindings.filePath && filePath !== void 0)
    $$bindings.filePath(filePath);
  $$result.css.add(css$1);
  return `<div class="${"file-content svelte-11nwffo"}"><!-- HTML_TAG_START -->${marked(fileContent)}<!-- HTML_TAG_END --></div>`;
});
let markdownFilePath$1 = "/md/help.md";
const Help = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(ImportedMarkdown, "ImportedMarkdown").$$render($$result, { filePath: markdownFilePath$1 }, {}, {})}`;
});
let markdownFilePath = "/md/welcome.md";
const Welcome = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(ImportedMarkdown, "ImportedMarkdown").$$render($$result, { filePath: markdownFilePath }, {}, {})}`;
});
var index_svelte_svelte_type_style_lang = "";
const css = {
  code: ".content.svelte-1g6nlu9{text-align:center;padding:0;display:flex;align-items:flex-start;flex-wrap:wrap;height:100%}.loader.svelte-1g6nlu9{position:absolute;padding-top:10vh;width:100%;height:100%;font-weight:700;font-size:3rem;text-align:center;background-color:#fff;opacity:1;z-index:9999;transition:opacity 0.25s ease-in-out, visibility 0.25s ease-in-out;visibility:visible}.loader.loaded.svelte-1g6nlu9{opacity:0;visibility:hidden}.tab-panel.svelte-1g6nlu9{flex-grow:1;overflow:overlay;position:relative;padding-bottom:4rem}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script>\\n\\timport { appStateStore, settingsStore, rawEntriesStore } from '../scripts/stores';\\n\\timport { Tabs, TabList, TabPanel, Tab } from './../components/tabs';\\n\\timport { parseEntries } from '../scripts/parseEntries';\\n\\n\\timport ForecastTable from '../components/ForecastTable.svelte';\\n\\timport Entries from '../components/Entries.svelte';\\n\\timport Settings from '../components/Settings.svelte';\\n\\timport Help from '../components/Help.svelte';\\n\\timport Welcome from '../components/Welcome.svelte';\\n\\n\\timport { initializeData } from '../components/data';\\n\\timport { onMount } from 'svelte';\\n\\n\\t$: balanceFlags = {\\n\\t\\tbelow: {\\n\\t\\t\\t'negative': 0,\\n\\t\\t\\t'low': $settingsStore.thresholdLowBalance,\\n\\t\\t\\t'uncomfortable': $settingsStore.thresholdUncomfortableBalance\\n\\t\\t},\\n\\t\\tabove: {\\n\\t\\t\\t'goal': $settingsStore.thresholdGoalBalance\\n\\t\\t}\\n\\t};\\n\\n\\t$: parsedEntries = $rawEntriesStore ? parseEntries($rawEntriesStore, $settingsStore.monthsToForecast, balanceFlags) : [];\\n\\n\\tonMount(() => {\\n\\t\\tinitializeData();\\n\\t});\\n\\n<\/script>\\n\\n\\n<div class=\\"content\\">\\n\\t<Tabs>\\n\\t\\t<TabList>\\n\\t\\t\\t<Tab>Welcome</Tab>\\n\\t\\t\\t<Tab>Entries</Tab>\\n\\t\\t\\t<Tab>Forecast</Tab>\\n\\t\\t\\t<Tab>Settings</Tab>\\n\\t\\t\\t<Tab>Help</Tab>\\n\\t\\t</TabList>\\n\\t\\t<div class=\\"tab-panel\\">\\n\\t\\t\\t<div class=\\"loader\\" class:loaded=\\"{!$appStateStore.showLoader}\\">\\n\\t\\t\\t\\tCalculating your forecast...\\n\\t\\t\\t</div>\\n\\t\\t\\t<TabPanel>\\n\\t\\t\\t\\t<Welcome></Welcome>\\n\\t\\t\\t</TabPanel>\\n\\t\\t\\t<TabPanel>\\n\\t\\t\\t\\t<Entries></Entries>\\n\\t\\t\\t</TabPanel>\\n\\t\\t\\t<TabPanel showLoader=\\"true\\">\\n\\t\\t\\t\\t<ForecastTable {parsedEntries}></ForecastTable>\\n\\t\\t\\t</TabPanel>\\n\\t\\t\\t<TabPanel>\\n\\t\\t\\t\\t<Settings></Settings>\\n\\t\\t\\t</TabPanel>\\n\\t\\t\\t<TabPanel>\\n\\t\\t\\t\\t<Help></Help>\\n\\t\\t\\t</TabPanel>\\n\\t\\t</div>\\n\\t</Tabs>\\n\\t{#if false}<slot></slot>{/if}\\n\\t<br style=\\"clear: both;\\">\\n</div>\\n\\n<style lang=\\"scss\\">.content {\\n  text-align: center;\\n  padding: 0;\\n  display: flex;\\n  align-items: flex-start;\\n  flex-wrap: wrap;\\n  height: 100%;\\n}\\n\\n.loader {\\n  position: absolute;\\n  padding-top: 10vh;\\n  width: 100%;\\n  height: 100%;\\n  font-weight: 700;\\n  font-size: 3rem;\\n  text-align: center;\\n  background-color: #fff;\\n  opacity: 1;\\n  z-index: 9999;\\n  transition: opacity 0.25s ease-in-out, visibility 0.25s ease-in-out;\\n  visibility: visible;\\n}\\n.loader.loaded {\\n  opacity: 0;\\n  visibility: hidden;\\n}\\n\\n.tab-panel {\\n  flex-grow: 1;\\n  overflow: overlay;\\n  position: relative;\\n  padding-bottom: 4rem;\\n}</style>"],"names":[],"mappings":"AAoEmB,QAAQ,eAAC,CAAC,AAC3B,UAAU,CAAE,MAAM,CAClB,OAAO,CAAE,CAAC,CACV,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,UAAU,CACvB,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,IAAI,AACd,CAAC,AAED,OAAO,eAAC,CAAC,AACP,QAAQ,CAAE,QAAQ,CAClB,WAAW,CAAE,IAAI,CACjB,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,WAAW,CAAE,GAAG,CAChB,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,MAAM,CAClB,gBAAgB,CAAE,IAAI,CACtB,OAAO,CAAE,CAAC,CACV,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,OAAO,CAAC,KAAK,CAAC,WAAW,CAAC,CAAC,UAAU,CAAC,KAAK,CAAC,WAAW,CACnE,UAAU,CAAE,OAAO,AACrB,CAAC,AACD,OAAO,OAAO,eAAC,CAAC,AACd,OAAO,CAAE,CAAC,CACV,UAAU,CAAE,MAAM,AACpB,CAAC,AAED,UAAU,eAAC,CAAC,AACV,SAAS,CAAE,CAAC,CACZ,QAAQ,CAAE,OAAO,CACjB,QAAQ,CAAE,QAAQ,CAClB,cAAc,CAAE,IAAI,AACtB,CAAC"}`
};
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let balanceFlags;
  let parsedEntries;
  let $settingsStore, $$unsubscribe_settingsStore;
  let $rawEntriesStore, $$unsubscribe_rawEntriesStore;
  let $appStateStore, $$unsubscribe_appStateStore;
  $$unsubscribe_settingsStore = subscribe(settingsStore, (value) => $settingsStore = value);
  $$unsubscribe_rawEntriesStore = subscribe(rawEntriesStore, (value) => $rawEntriesStore = value);
  $$unsubscribe_appStateStore = subscribe(appStateStore, (value) => $appStateStore = value);
  $$result.css.add(css);
  balanceFlags = {
    below: {
      "negative": 0,
      "low": $settingsStore.thresholdLowBalance,
      "uncomfortable": $settingsStore.thresholdUncomfortableBalance
    },
    above: {
      "goal": $settingsStore.thresholdGoalBalance
    }
  };
  parsedEntries = $rawEntriesStore ? parseEntries($rawEntriesStore, $settingsStore.monthsToForecast, balanceFlags) : [];
  $$unsubscribe_settingsStore();
  $$unsubscribe_rawEntriesStore();
  $$unsubscribe_appStateStore();
  return `<div class="${"content svelte-1g6nlu9"}">${validate_component(Tabs, "Tabs").$$render($$result, {}, {}, {
    default: () => `${validate_component(TabList, "TabList").$$render($$result, {}, {}, {
      default: () => `${validate_component(Tab, "Tab").$$render($$result, {}, {}, { default: () => `Welcome` })}
			${validate_component(Tab, "Tab").$$render($$result, {}, {}, { default: () => `Entries` })}
			${validate_component(Tab, "Tab").$$render($$result, {}, {}, { default: () => `Forecast` })}
			${validate_component(Tab, "Tab").$$render($$result, {}, {}, { default: () => `Settings` })}
			${validate_component(Tab, "Tab").$$render($$result, {}, {}, { default: () => `Help` })}`
    })}
		<div class="${"tab-panel svelte-1g6nlu9"}"><div class="${["loader svelte-1g6nlu9", !$appStateStore.showLoader ? "loaded" : ""].join(" ").trim()}">Calculating your forecast...
			</div>
			${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
      default: () => `${validate_component(Welcome, "Welcome").$$render($$result, {}, {}, {})}`
    })}
			${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
      default: () => `${validate_component(Entries, "Entries").$$render($$result, {}, {}, {})}`
    })}
			${validate_component(TabPanel, "TabPanel").$$render($$result, { showLoader: "true" }, {}, {
      default: () => `${validate_component(ForecastTable, "ForecastTable").$$render($$result, { parsedEntries }, {}, {})}`
    })}
			${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
      default: () => `${validate_component(Settings, "Settings").$$render($$result, {}, {}, {})}`
    })}
			${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
      default: () => `${validate_component(Help, "Help").$$render($$result, {}, {}, {})}`
    })}</div>`
  })}
	${``}
	<br style="${"clear: both;"}">
</div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes
});
const About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>About</title>`, ""}`, ""}

<h1>About this site</h1>

<p>This is the &#39;about&#39; page. There&#39;s not much here.</p>`;
});
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": About
});
export { init, render };
