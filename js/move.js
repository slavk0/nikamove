(function () {
    function require(name) {
        var module = require.modules[name];
        if (!module) throw new Error('failed to require "' + name + '"');
        if (!("exports" in module) && typeof module.definition === "function") {
            module.client = module.component = true;
            module.definition.call(this, (module.exports = {}), module);
            delete module.definition;
        }
        return module.exports;
    }
    require.loader = "component";
    require.helper = {};
    require.helper.semVerSort = function (a, b) {
        var aArray = a.version.split(".");
        var bArray = b.version.split(".");
        for (var i = 0; i < aArray.length; ++i) {
            var aInt = parseInt(aArray[i], 10);
            var bInt = parseInt(bArray[i], 10);
            if (aInt === bInt) {
                var aLex = aArray[i].substr(("" + aInt).length);
                var bLex = bArray[i].substr(("" + bInt).length);
                if (aLex === "" && bLex !== "") return 1;
                if (aLex !== "" && bLex === "") return -1;
                if (aLex !== "" && bLex !== "") return aLex > bLex ? 1 : -1;
                continue;
            } else if (aInt > bInt) {
                return 1;
            } else {
                return -1;
            }
        }
        return 0;
    };
    require.latest = function (name, returnPath) {
        function showError(name) {
            throw new Error('failed to find latest module of "' + name + '"');
        }
        var versionRegexp = /(.*)~(.*)@v?(\d+\.\d+\.\d+[^\/]*)$/;
        var remoteRegexp = /(.*)~(.*)/;
        if (!remoteRegexp.test(name)) showError(name);
        var moduleNames = Object.keys(require.modules);
        var semVerCandidates = [];
        var otherCandidates = [];
        for (var i = 0; i < moduleNames.length; i++) {
            var moduleName = moduleNames[i];
            if (new RegExp(name + "@").test(moduleName)) {
                var version = moduleName.substr(name.length + 1);
                var semVerMatch = versionRegexp.exec(moduleName);
                if (semVerMatch != null) {
                    semVerCandidates.push({
                        version: version,
                        name: moduleName,
                    });
                } else {
                    otherCandidates.push({
                        version: version,
                        name: moduleName,
                    });
                }
            }
        }
        if (semVerCandidates.concat(otherCandidates).length === 0) {
            showError(name);
        }
        if (semVerCandidates.length > 0) {
            var module = semVerCandidates
                .sort(require.helper.semVerSort)
                .pop().name;
            if (returnPath === true) {
                return module;
            }
            return require(module);
        }
        var module = otherCandidates.sort(function (a, b) {
            return a.name > b.name;
        })[0].name;
        if (returnPath === true) {
            return module;
        }
        return require(module);
    };
    require.modules = {};
    require.register = function (name, definition) {
        require.modules[name] = { definition: definition };
    };
    require.define = function (name, exports) {
        require.modules[name] = { exports: exports };
    };
    require.register(
        "component~transform-property@0.0.1",
        function (exports, module) {
            var styles = [
                "webkitTransform",
                "MozTransform",
                "msTransform",
                "OTransform",
                "transform",
            ];
            var el = document.createElement("p");
            var style;
            for (var i = 0; i < styles.length; i++) {
                style = styles[i];
                if (null != el.style[style]) {
                    module.exports = style;
                    break;
                }
            }
        }
    );
    require.register(
        "component~has-translate3d@0.0.3",
        function (exports, module) {
            var prop = require("component~transform-property@0.0.1");
            if (!prop || !window.getComputedStyle) {
                module.exports = false;
            } else {
                var map = {
                    webkitTransform: "-webkit-transform",
                    OTransform: "-o-transform",
                    msTransform: "-ms-transform",
                    MozTransform: "-moz-transform",
                    transform: "transform",
                };
                var el = document.createElement("div");
                el.style[prop] = "translate3d(1px,1px,1px)";
                document.body.insertBefore(el, null);
                var val = getComputedStyle(el).getPropertyValue(map[prop]);
                document.body.removeChild(el);
                module.exports = null != val && val.length && "none" != val;
            }
        }
    );
    require.register(
        "yields~has-transitions@1.0.0",
        function (exports, module) {
            exports = module.exports = function (el) {
                switch (arguments.length) {
                    case 0:
                        return bool;
                    case 1:
                        return bool ? transitions(el) : bool;
                }
            };
            function transitions(el, styl) {
                if (el.transition) return true;
                styl = window.getComputedStyle(el);
                return !!parseFloat(styl.transitionDuration, 10);
            }
            var styl = document.body.style;
            var bool =
                "transition" in styl ||
                "webkitTransition" in styl ||
                "MozTransition" in styl ||
                "msTransition" in styl;
        }
    );
    require.register("component~event@0.1.4", function (exports, module) {
        var bind = window.addEventListener ? "addEventListener" : "attachEvent",
            unbind = window.removeEventListener
                ? "removeEventListener"
                : "detachEvent",
            prefix = bind !== "addEventListener" ? "on" : "";
        exports.bind = function (el, type, fn, capture) {
            el[bind](prefix + type, fn, capture || false);
            return fn;
        };
        exports.unbind = function (el, type, fn, capture) {
            el[unbind](prefix + type, fn, capture || false);
            return fn;
        };
    });
    require.register("ecarter~css-emitter@0.0.1", function (exports, module) {
        var events = require("component~event@0.1.4");
        var watch = [
            "transitionend",
            "webkitTransitionEnd",
            "oTransitionEnd",
            "MSTransitionEnd",
            "animationend",
            "webkitAnimationEnd",
            "oAnimationEnd",
            "MSAnimationEnd",
        ];
        module.exports = CssEmitter;
        function CssEmitter(element) {
            if (!(this instanceof CssEmitter)) return new CssEmitter(element);
            this.el = element;
        }
        CssEmitter.prototype.bind = function (fn) {
            for (var i = 0; i < watch.length; i++) {
                events.bind(this.el, watch[i], fn);
            }
            return this;
        };
        CssEmitter.prototype.unbind = function (fn) {
            for (var i = 0; i < watch.length; i++) {
                events.unbind(this.el, watch[i], fn);
            }
            return this;
        };
        CssEmitter.prototype.once = function (fn) {
            var self = this;
            function on() {
                self.unbind(on);
                fn.apply(self.el, arguments);
            }
            self.bind(on);
            return this;
        };
    });
    require.register("component~once@0.0.1", function (exports, module) {
        var n = 0;
        var global = (function () {
            return this;
        })();
        module.exports = function (fn) {
            var id = n++;
            function once() {
                if (this == global) {
                    if (once.called) return;
                    once.called = true;
                    return fn.apply(this, arguments);
                }
                var key = "__called_" + id + "__";
                if (this[key]) return;
                this[key] = true;
                return fn.apply(this, arguments);
            }
            return once;
        };
    });
    require.register(
        "yields~after-transition@0.0.1",
        function (exports, module) {
            var has = require("yields~has-transitions@1.0.0"),
                emitter = require("ecarter~css-emitter@0.0.1"),
                once = require("component~once@0.0.1");
            var supported = has();
            module.exports = after;
            function after(el, fn) {
                if (!supported || !has(el)) return fn();
                emitter(el).bind(fn);
                return fn;
            }
            after.once = function (el, fn) {
                var callback = once(fn);
                after(
                    el,
                    (fn = function () {
                        emitter(el).unbind(fn);
                        callback();
                    })
                );
            };
        }
    );
    require.register("component~emitter@1.2.0", function (exports, module) {
        module.exports = Emitter;
        function Emitter(obj) {
            if (obj) return mixin(obj);
        }
        function mixin(obj) {
            for (var key in Emitter.prototype) {
                obj[key] = Emitter.prototype[key];
            }
            return obj;
        }
        Emitter.prototype.on = Emitter.prototype.addEventListener = function (
            event,
            fn
        ) {
            this._callbacks = this._callbacks || {};
            (this._callbacks["$" + event] =
                this._callbacks["$" + event] || []).push(fn);
            return this;
        };
        Emitter.prototype.once = function (event, fn) {
            function on() {
                this.off(event, on);
                fn.apply(this, arguments);
            }
            on.fn = fn;
            this.on(event, on);
            return this;
        };
        Emitter.prototype.off =
            Emitter.prototype.removeListener =
            Emitter.prototype.removeAllListeners =
            Emitter.prototype.removeEventListener =
                function (event, fn) {
                    this._callbacks = this._callbacks || {};
                    if (0 == arguments.length) {
                        this._callbacks = {};
                        return this;
                    }
                    var callbacks = this._callbacks["$" + event];
                    if (!callbacks) return this;
                    if (1 == arguments.length) {
                        delete this._callbacks["$" + event];
                        return this;
                    }
                    var cb;
                    for (var i = 0; i < callbacks.length; i++) {
                        cb = callbacks[i];
                        if (cb === fn || cb.fn === fn) {
                            callbacks.splice(i, 1);
                            break;
                        }
                    }
                    return this;
                };
        Emitter.prototype.emit = function (event) {
            this._callbacks = this._callbacks || {};
            var args = [].slice.call(arguments, 1),
                callbacks = this._callbacks["$" + event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, args);
                }
            }
            return this;
        };
        Emitter.prototype.listeners = function (event) {
            this._callbacks = this._callbacks || {};
            return this._callbacks["$" + event] || [];
        };
        Emitter.prototype.hasListeners = function (event) {
            return !!this.listeners(event).length;
        };
    });
    require.register("yields~css-ease@0.0.1", function (exports, module) {
        module.exports = {
            in: "ease-in",
            out: "ease-out",
            "in-out": "ease-in-out",
            snap: "cubic-bezier(0,1,.5,1)",
            linear: "cubic-bezier(0.250, 0.250, 0.750, 0.750)",
            "ease-in-quad": "cubic-bezier(0.550, 0.085, 0.680, 0.530)",
            "ease-in-cubic": "cubic-bezier(0.550, 0.055, 0.675, 0.190)",
            "ease-in-quart": "cubic-bezier(0.895, 0.030, 0.685, 0.220)",
            "ease-in-quint": "cubic-bezier(0.755, 0.050, 0.855, 0.060)",
            "ease-in-sine": "cubic-bezier(0.470, 0.000, 0.745, 0.715)",
            "ease-in-expo": "cubic-bezier(0.950, 0.050, 0.795, 0.035)",
            "ease-in-circ": "cubic-bezier(0.600, 0.040, 0.980, 0.335)",
            "ease-in-back": "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
            "ease-out-quad": "cubic-bezier(0.250, 0.460, 0.450, 0.940)",
            "ease-out-cubic": "cubic-bezier(0.215, 0.610, 0.355, 1.000)",
            "ease-out-quart": "cubic-bezier(0.165, 0.840, 0.440, 1.000)",
            "ease-out-quint": "cubic-bezier(0.230, 1.000, 0.320, 1.000)",
            "ease-out-sine": "cubic-bezier(0.390, 0.575, 0.565, 1.000)",
            "ease-out-expo": "cubic-bezier(0.190, 1.000, 0.220, 1.000)",
            "ease-out-circ": "cubic-bezier(0.075, 0.820, 0.165, 1.000)",
            "ease-out-back": "cubic-bezier(0.175, 0.885, 0.320, 1.275)",
            "ease-out-quad": "cubic-bezier(0.455, 0.030, 0.515, 0.955)",
            "ease-out-cubic": "cubic-bezier(0.645, 0.045, 0.355, 1.000)",
            "ease-in-out-quart": "cubic-bezier(0.770, 0.000, 0.175, 1.000)",
            "ease-in-out-quint": "cubic-bezier(0.860, 0.000, 0.070, 1.000)",
            "ease-in-out-sine": "cubic-bezier(0.445, 0.050, 0.550, 0.950)",
            "ease-in-out-expo": "cubic-bezier(1.000, 0.000, 0.000, 1.000)",
            "ease-in-out-circ": "cubic-bezier(0.785, 0.135, 0.150, 0.860)",
            "ease-in-out-back": "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
        };
    });
    require.register("component~query@0.0.3", function (exports, module) {
        function one(selector, el) {
            return el.querySelector(selector);
        }
        exports = module.exports = function (selector, el) {
            el = el || document;
            return one(selector, el);
        };
        exports.all = function (selector, el) {
            el = el || document;
            return el.querySelectorAll(selector);
        };
        exports.engine = function (obj) {
            if (!obj.one) throw new Error(".one callback required");
            if (!obj.all) throw new Error(".all callback required");
            one = obj.one;
            exports.all = obj.all;
            return exports;
        };
    });
    require.register("move", function (exports, module) {
        var Emitter = require("component~emitter@1.2.0");
        var query = require("component~query@0.0.3");
        var after = require("yields~after-transition@0.0.1");
        var has3d = require("component~has-translate3d@0.0.3");
        var ease = require("yields~css-ease@0.0.1");
        var translate = has3d ? ["translate3d(", ", 0)"] : ["translate(", ")"];
        module.exports = Move;
        var style = window.getComputedStyle || window.currentStyle;
        Move.version = "0.5.0";
        Move.ease = ease;
        Move.defaults = { duration: 500 };
        Move.select = function (selector) {
            if ("string" != typeof selector) return selector;
            return query(selector);
        };
        function Move(el) {
            if (!(this instanceof Move)) return new Move(el);
            if ("string" == typeof el) el = query(el);
            if (!el)
                throw new TypeError(
                    "Move must be initialized with element or selector"
                );
            this.el = el;
            this._props = {};
            this._rotate = 0;
            this._transitionProps = [];
            this._transforms = [];
            this.duration(Move.defaults.duration);
        }
        Emitter(Move.prototype);
        Move.prototype.transform = function (transform) {
            this._transforms.push(transform);
            return this;
        };
        Move.prototype.skew = function (x, y) {
            return this.transform("skew(" + x + "deg, " + (y || 0) + "deg)");
        };
        Move.prototype.skewX = function (n) {
            return this.transform("skewX(" + n + "deg)");
        };
        Move.prototype.skewY = function (n) {
            return this.transform("skewY(" + n + "deg)");
        };
        Move.prototype.translate = Move.prototype.to = function (x, y) {
            return this.transform(
                translate.join("" + x + "px, " + (y || 0) + "px")
            );
        };
        Move.prototype.translateX = Move.prototype.x = function (n) {
            return this.transform("translateX(" + n + "px)");
        };
        Move.prototype.translateY = Move.prototype.y = function (n) {
            return this.transform("translateY(" + n + "px)");
        };
        Move.prototype.scale = function (x, y) {
            return this.transform("scale(" + x + ", " + (y || x) + ")");
        };
        Move.prototype.scaleX = function (n) {
            return this.transform("scaleX(" + n + ")");
        };
        Move.prototype.matrix = function (m11, m12, m21, m22, m31, m32) {
            return this.transform(
                "matrix(" + [m11, m12, m21, m22, m31, m32].join(",") + ")"
            );
        };
        Move.prototype.scaleY = function (n) {
            return this.transform("scaleY(" + n + ")");
        };
        Move.prototype.rotate = function (n) {
            return this.transform("rotate(" + n + "deg)");
        };
        Move.prototype.ease = function (fn) {
            fn = ease[fn] || fn || "ease";
            return this.setVendorProperty("transition-timing-function", fn);
        };
        Move.prototype.animate = function (name, props) {
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    this.setVendorProperty("animation-" + i, props[i]);
                }
            }
            return this.setVendorProperty("animation-name", name);
        };
        Move.prototype.duration = function (n) {
            n = this._duration = "string" == typeof n ? parseFloat(n) * 1e3 : n;
            return this.setVendorProperty("transition-duration", n + "ms");
        };
        Move.prototype.delay = function (n) {
            n = "string" == typeof n ? parseFloat(n) * 1e3 : n;
            return this.setVendorProperty("transition-delay", n + "ms");
        };
        Move.prototype.setProperty = function (prop, val) {
            this._props[prop] = val;
            return this;
        };
        Move.prototype.setVendorProperty = function (prop, val) {
            this.setProperty("-webkit-" + prop, val);
            this.setProperty("-moz-" + prop, val);
            this.setProperty("-ms-" + prop, val);
            this.setProperty("-o-" + prop, val);
            return this;
        };
        Move.prototype.set = function (prop, val) {
            this.transition(prop);
            this._props[prop] = val;
            return this;
        };
        Move.prototype.add = function (prop, val) {
            if (!style) return;
            var self = this;
            return this.on("start", function () {
                var curr = parseInt(self.current(prop), 10);
                self.set(prop, curr + val + "px");
            });
        };
        Move.prototype.sub = function (prop, val) {
            if (!style) return;
            var self = this;
            return this.on("start", function () {
                var curr = parseInt(self.current(prop), 10);
                self.set(prop, curr - val + "px");
            });
        };
        Move.prototype.current = function (prop) {
            return style(this.el).getPropertyValue(prop);
        };
        Move.prototype.transition = function (prop) {
            if (!this._transitionProps.indexOf(prop)) return this;
            this._transitionProps.push(prop);
            return this;
        };
        Move.prototype.applyProperties = function () {
            for (var prop in this._props) {
                this.el.style.setProperty(prop, this._props[prop], "");
            }
            return this;
        };
        Move.prototype.move = Move.prototype.select = function (selector) {
            this.el = Move.select(selector);
            return this;
        };
        Move.prototype.then = function (fn) {
            if (fn instanceof Move) {
                this.on("end", function () {
                    fn.end();
                });
            } else if ("function" == typeof fn) {
                this.on("end", fn);
            } else {
                var clone = new Move(this.el);
                clone._transforms = this._transforms.slice(0);
                this.then(clone);
                clone.parent = this;
                return clone;
            }
            return this;
        };
        Move.prototype.pop = function () {
            return this.parent;
        };
        Move.prototype.reset = function () {
            this.el.style.webkitTransitionDuration =
                this.el.style.mozTransitionDuration =
                this.el.style.msTransitionDuration =
                this.el.style.oTransitionDuration =
                    "";
            return this;
        };
        Move.prototype.end = function (fn) {
            var self = this;
            this.emit("start");
            if (this._transforms.length) {
                this.setVendorProperty("transform", this._transforms.join(" "));
            }
            this.setVendorProperty(
                "transition-properties",
                this._transitionProps.join(", ")
            );
            this.applyProperties();
            if (fn) this.then(fn);
            after.once(this.el, function () {
                self.reset();
                self.emit("end");
            });
            return this;
        };
    });
    if (typeof exports == "object") {
        module.exports = require("move");
    } else if (typeof define == "function" && define.amd) {
        define("move", [], function () {
            return require("move");
        });
    } else {
        (this || window)["move"] = require("move");
    }
})();
