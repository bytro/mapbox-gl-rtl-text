(function(){
(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(module.exports)
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    factory(global);
  }
}) (this, function (exports) {
var Module = {
  TOTAL_MEMORY: 8*1024*1024,
  TOTAL_STACK: 2*1024*1024 ,
  preRun: [],
  postRun: [],
  print: function( text ) {
    console.log(text);
  },
  printErr: function(text) {
    text = Array.prototype.slice.call(arguments).join(' ');
    if ( text.indexOf( 'pre-main prep time' ) >= 0 ) {
      return;
    }
    console.error(text);
  }
};
var Module = typeof Module !== 'undefined' ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key];
    }
}
var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function (status, toThrow) {
    throw toThrow;
};
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
var scriptDirectory = '';
function locateFile(path) {
    if (Module['locateFile']) {
        return Module['locateFile'](path, scriptDirectory);
    }
    return scriptDirectory + path;
}
var read_, readAsync, readBinary, setWindowTitle;
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
    } else if (typeof document !== 'undefined' && document.currentScript) {
        scriptDirectory = document.currentScript.src;
    }
    if (scriptDirectory.indexOf('blob:') !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1);
    } else {
        scriptDirectory = '';
    }
    {
        read_ = function (url) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send(null);
            return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = function (url) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.responseType = 'arraybuffer';
                xhr.send(null);
                return new Uint8Array(xhr.response);
            };
        }
        readAsync = function (url, onload, onerror) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return;
                }
                onerror();
            };
            xhr.onerror = onerror;
            xhr.send(null);
        };
    }
    setWindowTitle = function (title) {
        document.title = title;
    };
} else {
}
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);
for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key];
    }
}
moduleOverrides = null;
if (Module['arguments'])
    arguments_ = Module['arguments'];
if (Module['thisProgram'])
    thisProgram = Module['thisProgram'];
if (Module['quit'])
    quit_ = Module['quit'];
var wasmBinary;
if (Module['wasmBinary'])
    wasmBinary = Module['wasmBinary'];
var noExitRuntime = Module['noExitRuntime'] || true;
if (typeof WebAssembly !== 'object') {
    abort('no native wasm support detected');
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
function assert_em(condition, text) {
    if (!condition) {
        abort('Assertion failed: ' + text);
    }
}
function getCFunc(ident) {
    var func = Module['_' + ident];
    return func;
}
function ccall(ident, returnType, argTypes, args, opts) {
    var toC = {
        'string': function (str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                var len = (str.length << 2) + 1;
                ret = stackAlloc(len);
                stringToUTF8(str, ret, len);
            }
            return ret;
        },
        'array': function (arr) {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret;
        }
    };
    function convertReturnValue(ret) {
        if (returnType === 'string')
            return UTF8ToString(ret);
        if (returnType === 'boolean')
            return Boolean(ret);
        return ret;
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
        for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
                if (stack === 0)
                    stack = stackSave();
                cArgs[i] = converter(args[i]);
            } else {
                cArgs[i] = args[i];
            }
        }
    }
    var ret = func.apply(null, cArgs);
    function onDone(ret) {
        if (stack !== 0)
            stackRestore(stack);
        return convertReturnValue(ret);
    }
    ret = onDone(ret);
    return ret;
}
var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heap[endPtr] && !(endPtr >= endIdx))
        ++endPtr;
    if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr));
    } else {
        var str = '';
        while (idx < endPtr) {
            var u0 = heap[idx++];
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue;
            }
            var u1 = heap[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
            }
            var u2 = heap[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
            } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63;
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0);
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
            }
        }
    }
    return str;
}
function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0))
        return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
            if (outIdx >= endIdx)
                break;
            heap[outIdx++] = u;
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx)
                break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx)
                break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
        } else {
            if (outIdx + 3 >= endIdx)
                break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr, maxBytesToRead) {
    var endPtr = ptr;
    var idx = endPtr >> 1;
    var maxIdx = idx + maxBytesToRead / 2;
    while (!(idx >= maxIdx) && HEAPU16[idx])
        ++idx;
    endPtr = idx << 1;
    if (endPtr - ptr > 32 && UTF16Decoder) {
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
    } else {
        var str = '';
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
            var codeUnit = HEAP16[ptr + i * 2 >> 1];
            if (codeUnit == 0)
                break;
            str += String.fromCharCode(codeUnit);
        }
        return str;
    }
}
function stringToUTF16(str, outPtr, maxBytesToWrite) {
    if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647;
    }
    if (maxBytesToWrite < 2)
        return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr;
}
function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer);
}
function alignUp(x, multiple) {
    if (x % multiple > 0) {
        x += multiple - x % multiple;
    }
    return x;
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module['HEAP8'] = HEAP8 = new Int8Array(buf);
    Module['HEAP16'] = HEAP16 = new Int16Array(buf);
    Module['HEAP32'] = HEAP32 = new Int32Array(buf);
    Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
    Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
    Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
    Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
    Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}
var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
function preRun() {
    if (Module['preRun']) {
        if (typeof Module['preRun'] == 'function')
            Module['preRun'] = [Module['preRun']];
        while (Module['preRun'].length) {
            addOnPreRun(Module['preRun'].shift());
        }
    }
    callRuntimeCallbacks(__ATPRERUN__);
}
function initRuntime() {
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
}
function postRun() {
    if (Module['postRun']) {
        if (typeof Module['postRun'] == 'function')
            Module['postRun'] = [Module['postRun']];
        while (Module['postRun'].length) {
            addOnPostRun(Module['postRun'].shift());
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
}
function addOnInit(cb) {
    __ATINIT__.unshift(cb);
}
function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
    runDependencies++;
    if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
    }
}
function removeRunDependency(id) {
    runDependencies--;
    if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback();
        }
    }
}
Module['preloadedImages'] = {};
Module['preloadedAudios'] = {};
function abort(what) {
    {
        if (Module['onAbort']) {
            Module['onAbort'](what);
        }
    }
    what = 'Aborted(' + what + ')';
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    what += '. Build with -s ASSERTIONS=1 for more info.';
    var e = new WebAssembly.RuntimeError(what);
    throw e;
}
var dataURIPrefix = 'data:application/octet-stream;base64,';
function isDataURI(filename) {
    return filename.startsWith(dataURIPrefix);
}
function isFileURI(filename) {
    return filename.startsWith('file://');
}
var wasmBinaryFile;
wasmBinaryFile = 'wrapper.wasm.wasm';
if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
}
function getBinary(file) {
    try {
        if (file == wasmBinaryFile && wasmBinary) {
            return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
            return readBinary(file);
        } else {
            throw 'both async and sync fetching of the wasm failed';
        }
    } catch (err) {
        abort(err);
    }
}
function getBinaryPromise() {
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch === 'function' && !isFileURI(wasmBinaryFile)) {
            return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
                if (!response['ok']) {
                    throw 'failed to load wasm binary file at \'' + wasmBinaryFile + '\'';
                }
                return response['arrayBuffer']();
            }).catch(function () {
                return getBinary(wasmBinaryFile);
            });
        } else {
            if (readAsync) {
                return new Promise(function (resolve, reject) {
                    readAsync(wasmBinaryFile, function (response) {
                        resolve(new Uint8Array(response));
                    }, reject);
                });
            }
        }
    }
    return Promise.resolve().then(function () {
        return getBinary(wasmBinaryFile);
    });
}
function createWasm() {
    var info = { 'a': asmLibraryArg };
    function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module['asm'] = exports;
        wasmMemory = Module['asm']['b'];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module['asm']['m'];
        addOnInit(Module['asm']['c']);
        removeRunDependency('wasm-instantiate');
    }
    addRunDependency('wasm-instantiate');
    function receiveInstantiationResult(result) {
        receiveInstance(result['instance']);
    }
    function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function (binary) {
            return WebAssembly.instantiate(binary, info);
        }).then(function (instance) {
            return instance;
        }).then(receiver, function (reason) {
            err('failed to asynchronously prepare wasm: ' + reason);
            abort(reason);
        });
    }
    function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming === 'function' && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === 'function') {
            return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiationResult, function (reason) {
                    err('wasm streaming compile failed: ' + reason);
                    err('falling back to ArrayBuffer instantiation');
                    return instantiateArrayBuffer(receiveInstantiationResult);
                });
            });
        } else {
            return instantiateArrayBuffer(receiveInstantiationResult);
        }
    }
    if (Module['instantiateWasm']) {
        try {
            var exports = Module['instantiateWasm'](info, receiveInstance);
            return exports;
        } catch (e) {
            err('Module.instantiateWasm callback failed with error: ' + e);
            return false;
        }
    }
    instantiateAsync();
    return {};
}
function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == 'function') {
            callback(Module);
            continue;
        }
        var func = callback.func;
        if (typeof func === 'number') {
            if (callback.arg === undefined) {
                wasmTable.get(func)();
            } else {
                wasmTable.get(func)(callback.arg);
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg);
        }
    }
}
function emscripten_realloc_buffer(size) {
    try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1;
    } catch (e) {
    }
}
function _emscripten_resize_heap(requestedSize) {
    var oldSize = HEAPU8.length;
    requestedSize = requestedSize >>> 0;
    var maxHeapSize = 2147483648;
    if (requestedSize > maxHeapSize) {
        return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
            return true;
        }
    }
    return false;
}
var asmLibraryArg = { 'a': _emscripten_resize_heap };
var asm = createWasm();
var ___wasm_call_ctors = Module['___wasm_call_ctors'] = function () {
    return (___wasm_call_ctors = Module['___wasm_call_ctors'] = Module['asm']['c']).apply(null, arguments);
};
var _ushape_arabic = Module['_ushape_arabic'] = function () {
    return (_ushape_arabic = Module['_ushape_arabic'] = Module['asm']['d']).apply(null, arguments);
};
var _malloc = Module['_malloc'] = function () {
    return (_malloc = Module['_malloc'] = Module['asm']['e']).apply(null, arguments);
};
var _free = Module['_free'] = function () {
    return (_free = Module['_free'] = Module['asm']['f']).apply(null, arguments);
};
var _bidi_processText = Module['_bidi_processText'] = function () {
    return (_bidi_processText = Module['_bidi_processText'] = Module['asm']['g']).apply(null, arguments);
};
var _bidi_getParagraphEndIndex = Module['_bidi_getParagraphEndIndex'] = function () {
    return (_bidi_getParagraphEndIndex = Module['_bidi_getParagraphEndIndex'] = Module['asm']['h']).apply(null, arguments);
};
var _bidi_getVisualRun = Module['_bidi_getVisualRun'] = function () {
    return (_bidi_getVisualRun = Module['_bidi_getVisualRun'] = Module['asm']['i']).apply(null, arguments);
};
var _bidi_setLine = Module['_bidi_setLine'] = function () {
    return (_bidi_setLine = Module['_bidi_setLine'] = Module['asm']['j']).apply(null, arguments);
};
var _bidi_writeReverse = Module['_bidi_writeReverse'] = function () {
    return (_bidi_writeReverse = Module['_bidi_writeReverse'] = Module['asm']['k']).apply(null, arguments);
};
var _bidi_getLine = Module['_bidi_getLine'] = function () {
    return (_bidi_getLine = Module['_bidi_getLine'] = Module['asm']['l']).apply(null, arguments);
};
var stackSave = Module['stackSave'] = function () {
    return (stackSave = Module['stackSave'] = Module['asm']['n']).apply(null, arguments);
};
var stackRestore = Module['stackRestore'] = function () {
    return (stackRestore = Module['stackRestore'] = Module['asm']['o']).apply(null, arguments);
};
var stackAlloc = Module['stackAlloc'] = function () {
    return (stackAlloc = Module['stackAlloc'] = Module['asm']['p']).apply(null, arguments);
};
Module['ccall'] = ccall;
Module['UTF16ToString'] = UTF16ToString;
Module['stringToUTF16'] = stringToUTF16;
var calledRun;
dependenciesFulfilled = function runCaller() {
    if (!calledRun)
        run();
    if (!calledRun)
        dependenciesFulfilled = runCaller;
};
function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) {
        return;
    }
    preRun();
    if (runDependencies > 0) {
        return;
    }
    function doRun() {
        if (calledRun)
            return;
        calledRun = true;
        Module['calledRun'] = true;
        if (ABORT)
            return;
        initRuntime();
        if (Module['onRuntimeInitialized'])
            Module['onRuntimeInitialized']();
        postRun();
    }
    if (Module['setStatus']) {
        Module['setStatus']('Running...');
        setTimeout(function () {
            setTimeout(function () {
                Module['setStatus']('');
            }, 1);
            doRun();
        }, 1);
    } else {
        doRun();
    }
}
Module['run'] = run;
if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function')
        Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
        Module['preInit'].pop()();
    }
}
run();
'use strict';


/**
 * Takes logical input and replaces Arabic characters with the "presentation form"
 * of their initial/medial/final forms, based on their order in the input.
 *
 * The results are still in logical order.
 *
 * @param {string} [input] Input text in logical order
 * @returns {string} Transformed text using Arabic presentation forms
 */
function applyArabicShaping(input) {
    if (!input)
        { return input; }

    var nDataBytes = (input.length + 1) * 2;
    var stringInputPtr = Module._malloc(nDataBytes);
    Module.stringToUTF16(input, stringInputPtr, nDataBytes);
    var returnStringPtr = Module.ccall('ushape_arabic', 'number', ['number', 'number'], [stringInputPtr, input.length]);
    Module._free(stringInputPtr);

    if (returnStringPtr === 0)
        { return input; }

    var result = Module.UTF16ToString(returnStringPtr);
    Module._free(returnStringPtr);

    return result;
}

function mergeParagraphLineBreakPoints(lineBreakPoints, paragraphCount) {
    var mergedParagraphLineBreakPoints = [];

    for (var i = 0; i < paragraphCount; i++) {
        var paragraphEndIndex = Module.ccall('bidi_getParagraphEndIndex', 'number', ['number'], [i]);
        // TODO: Handle error?

        for (var i$1 = 0, list = lineBreakPoints; i$1 < list.length; i$1 += 1) {
            var lineBreakPoint = list[i$1];

            if (lineBreakPoint < paragraphEndIndex &&
                (!mergedParagraphLineBreakPoints[mergedParagraphLineBreakPoints.length - 1] || lineBreakPoint > mergedParagraphLineBreakPoints[mergedParagraphLineBreakPoints.length - 1]))
                { mergedParagraphLineBreakPoints.push(lineBreakPoint); }
        }
        mergedParagraphLineBreakPoints.push(paragraphEndIndex);
    }

    for (var i$2 = 0, list$1 = lineBreakPoints; i$2 < list$1.length; i$2 += 1) {
        var lineBreakPoint$1 = list$1[i$2];

        if (lineBreakPoint$1 > mergedParagraphLineBreakPoints[mergedParagraphLineBreakPoints.length - 1])
            { mergedParagraphLineBreakPoints.push(lineBreakPoint$1); }
    }

    return mergedParagraphLineBreakPoints;
}

// This function is stateful: it sets a static BiDi paragaph object
// on the "native" side
function setParagraph(input, stringInputPtr, nDataBytes) {
    if (!input) {
        return null;
    }

    Module.stringToUTF16(input, stringInputPtr, nDataBytes);
    var paragraphCount = Module.ccall('bidi_processText', 'number', ['number', 'number'], [stringInputPtr, input.length]);

    if (paragraphCount === 0) {
        Module._free(stringInputPtr);
        return null;
    }
    return paragraphCount;
}

/**
 * Takes input text in logical order and applies the BiDi algorithm using the chosen
 * line break point to generate a set of lines with the characters re-arranged into
 * visual order.
 *
 * @param {string} [input] Input text in logical order
 * @param {Array<number>} [lineBreakPoints] Each line break is an index into the input string
 *
 * @returns {Array<string>} One string per line, with each string in visual order
 */
function processBidirectionalText(input, lineBreakPoints) {
    var nDataBytes = (input.length + 1) * 2;
    var stringInputPtr = Module._malloc(nDataBytes);
    var paragraphCount = setParagraph(input, stringInputPtr, nDataBytes);
    if (!paragraphCount) {
        return [input];
    }

    var mergedParagraphLineBreakPoints = mergeParagraphLineBreakPoints(lineBreakPoints, paragraphCount);

    var lineStartIndex = 0;
    var lines = [];

    for (var i = 0, list = mergedParagraphLineBreakPoints; i < list.length; i += 1) {
        var lineBreakPoint = list[i];

        var returnStringPtr = Module.ccall('bidi_getLine', 'number', ['number', 'number'], [lineStartIndex, lineBreakPoint]);

        if (returnStringPtr === 0) {
            Module._free(stringInputPtr);
            return []; // TODO: throw exception?
        }

        lines.push(Module.UTF16ToString(returnStringPtr));
        Module._free(returnStringPtr);

        lineStartIndex = lineBreakPoint;
    }

    Module._free(stringInputPtr); // Input string must live until getLine calls are finished

    return lines;
}

function createInt32Ptr() {
    return Module._malloc(4);
}

function consumeInt32Ptr(ptr) {
    var heapView = new Int32Array(Module.HEAPU8.buffer, ptr, 1);
    var result = heapView[0];
    Module._free(ptr);
    return result;
}

function writeReverse(stringInputPtr, logicalStart, logicalEnd) {
    var returnStringPtr = Module.ccall('bidi_writeReverse', 'number', ['number', 'number', 'number'], [stringInputPtr, logicalStart, logicalEnd - logicalStart]);

    if (returnStringPtr === 0) {
        return null;
    }
    var reversed = Module.UTF16ToString(returnStringPtr);
    Module._free(returnStringPtr);
    return reversed;
}

/**
 * Takes input text in logical order and applies the BiDi algorithm using the chosen
 * line break point to generate a set of lines with the characters re-arranged into
 * visual order.
 *
 * Also takes an array of "style indices" that specify different styling on the input
 * characters (the styles are represented as integers here, the caller is responsible
 * for the actual implementation of styling). BiDi can both reorder and add/remove
 * characters from the input string, but this function copies style information from
 * the "source" logical characters to their corresponding visual characters in the output.
 *
 * @param {string} [input] Input text in logical order
 * @param {Array<number>} [styleIndices] Same length as input text, each entry represents the style
 *                                       of the corresponding input character.
 * @param {Array<number>} [lineBreakPoints] Each line break is an index into the input string
 * @returns {Array<[string,Array<number>>]} One string per line, with each string in visual order.
 *                               Each string has a matching array of style indices in the same order.
 */
function processStyledBidirectionalText(text, styleIndices, lineBreakPoints) {
    var nDataBytes = (text.length + 1) * 2;
    var stringInputPtr = Module._malloc(nDataBytes);
    var paragraphCount = setParagraph(text, stringInputPtr, nDataBytes);
    if (!paragraphCount) {
        return [{text: text, styleIndices: styleIndices}];
    }

    var mergedParagraphLineBreakPoints = mergeParagraphLineBreakPoints(lineBreakPoints, paragraphCount);

    var lineStartIndex = 0;
    var lines = [];

    for (var i$1 = 0, list = mergedParagraphLineBreakPoints; i$1 < list.length; i$1 += 1) {
        var lineBreakPoint = list[i$1];

        var lineText = "";
        var lineStyleIndices = [];
        var runCount = Module.ccall('bidi_setLine', 'number', ['number', 'number'], [lineStartIndex, lineBreakPoint]);

        if (!runCount) {
            Module._free(stringInputPtr);
            return []; // TODO: throw exception?
        }

        for (var i = 0; i < runCount; i++) {
            var logicalStartPtr = createInt32Ptr();
            var logicalLengthPtr = createInt32Ptr();
            var isReversed = Module.ccall('bidi_getVisualRun', 'number', ['number', 'number', 'number'], [i, logicalStartPtr, logicalLengthPtr]);

            var logicalStart = lineStartIndex + consumeInt32Ptr(logicalStartPtr);
            var logicalLength = consumeInt32Ptr(logicalLengthPtr);
            var logicalEnd = logicalStart + logicalLength;
            if (isReversed) {
                // Within this reversed section, iterate logically backwards
                // Each time we see a change in style, render a reversed chunk
                // of everything since the last change
                var styleRunStart = logicalEnd;
                var currentStyleIndex = styleIndices[styleRunStart - 1];
                for (var j = logicalEnd - 1; j >= logicalStart; j--) {
                    if (currentStyleIndex !== styleIndices[j] || j === logicalStart) {
                        var styleRunEnd = j === logicalStart ? j : j + 1;
                        var reversed = writeReverse(stringInputPtr, styleRunEnd, styleRunStart);
                        if (!reversed) {
                            Module._free(stringInputPtr);
                            return [];
                        }
                        lineText += reversed;
                        for (var k = 0; k < reversed.length; k++) {
                            lineStyleIndices.push(currentStyleIndex);
                        }
                        currentStyleIndex = styleIndices[j];
                        styleRunStart = styleRunEnd;
                    }
                }

            } else {
                lineText += text.substring(logicalStart, logicalEnd);
                lineStyleIndices = lineStyleIndices.concat(styleIndices.slice(logicalStart, logicalEnd));
            }
        }

        lines.push([lineText, lineStyleIndices]);
        lineStartIndex = lineBreakPoint;
    }

    Module._free(stringInputPtr); // Input string must live until getLine calls are finished

    return lines;
}

self.registerRTLTextPlugin({'applyArabicShaping': applyArabicShaping, 'processBidirectionalText': processBidirectionalText, 'processStyledBidirectionalText': processStyledBidirectionalText});

});
})();
