var version = "6.0.0";
var fs = require("fs");
var path = require("path");
var rl = require('./readline-sync');
var parser = require("./parser");
var child = require("child_process");
Object.defineProperty(global, '__stack', {
	get: function() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
      return stack;
    };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__line', {
	get: function() {
    return __stack[2].getLineNumber();
  }
});
Object.defineProperty(global, '__line2', {
	get: function() {
    return __stack[3].getLineNumber();
  }
});

Object.defineProperty(global, '__function', {
	get: function() {
    return __stack[2].getFunctionName();
  }
});



var rootns = newcpt();
var protos = {};
var protolist = [
    "Function",
    "Native",
    "Undefined",
    "String",
    "Number",
    "Word",
    "Raw",
    "Addr"
];
protos.PROTO = getcpt(rootns, "PROTO");
for(var i in protolist){
	var p = protolist[i];
	protos[p] = getcpt(rootns, p);
	protos[p].proto.PROTO = protos.PROTO;
}
var rootref = newref("rootns", undefined, rootns);
rootref.static.name = "rootns"
var native = {};
function deffunc(func, ex){
	var argnum = func.length;
	var cpt = newcpt("Function");
	cpt.static.argdef = [];
	for(var i=0; i< argnum; i++){
		cpt.static.argdef.push({i: i, type: "Cpt"});
	}
	cpt.static.native = func;
	cpt.proto.Native = protos.Native;
	native[func.name.substr(1)] = cpt;
	if(ex)
		ex(cpt);
	return cpt;
}
deffunc(function _assign(left, right){
	left.static.value = right;
	right.refed[left.static.name] = left;
}, function(cpt){cpt.static.argdef[0].type = "Addr"});
deffunc(function _exec(file){
});
deffunc(function _inspect(obj){
	log(obj);
});
deffunc(function _print(obj){
	log(obj.static.raw);
});
deffunc(function _printcharcode(obj){
	printcharcode(obj.static.raw)
});
deffunc(function _ask(cpt){
	var self = this;
	var env = this.env;
	ask(cpt.static.raw, env);	
});
deffunc(function _vaguecall(aste){
	var self = this;
	var calls = vague2call(aste.static.raw, self.env);
	for(var i in calls){
		call(calls[i], self.env);
	}
});
deffunc(function _get(id){
	var self = this;
	var addr = id.static.raw;
	var cpt = getcpt(self.env, addr);
	return firstv(cpt.refed);
});
deffunc(function _trWord2Addr(word){
	var self = this;
	var addr = word.static.raw;
	var cpt = getcpt(self.env, addr);
	return firstv(cpt.refed);
});


protos.Word.static.parent = {
	"String": 1
}
protos.Word.static.transit = {
	"File": 1,
	"Addr": 1
}

for(var key in native){
	newref(key, rootns, native[key]);
}
module.exports = disp;
function disp(str, config){
	if(!config) config = {};
	var env = config.env || newenv(rootns);
	if(config.interactive){
		var cpt = newcpt("Interactive");
		newref("interactive", env, cpt);
	}	
	//	log(str);
	if(str == "``"){
		return ask("hello", env)
	}
	var ast = str2ast(str);
//	log(ast);
	var callobj = ast2call(ast);
	var rtn = call(callobj, env);
	return rtn;
}
function firstv(obj){
	return obj[Object.keys(obj)[0]];
}
function printcharcode(str){
	var ostr = "";
	for(var i in str){
		ostr += str[i].charCodeAt(0) + " ";
	}
	log(ostr);
}
function str2ast(str){
	if(str == undefined || str == null || str == "") return;
	return parser.parse(str);
}
function ask(question, env){
	var interactive = getcpt(env, "interactive", {notnew:1});
	if(!interactive) return;//auto answer+
	
	var ans = rl.question(question+"?\n>");
	if(!ans){
		var str2 = rl.getRawInput();
		if(str2[0].charCodeAt(0) == 0)
			return;
		else
			ask("type again", env)
	}
//	return ans;
	return disp("`"+ans+"`", {env: env});
}
function newenv(env){
	var newenv = newcpt();
	newref(undefined, env, newenv);
	return newenv;
}
function newcpt(p){
	var cpt = {
		static: {},
		dynamic: {},
		proto: {},//proto
		refed: {},//
		index: 0,
		___iscpt: 1
	}
	if(p){
		cpt.proto[p] = protos[p];
	}
	return cpt;
}
function newref(name, from, value, type){
	if(!name){
		name = "ref"+from.index;
		from.index++;
	}
	var ncpt = newcpt("Addr");
	ncpt.static = {
		name: name,
		from: from,
		value: value,
		type: type
	}
	if(value)
		value.refed[name] = ncpt;
	if(from)
		from.dynamic[name] = ncpt;
	return ncpt;
}
function getcpt(cpt, name, config){
	if(cpt.dynamic[name])
		return cpt.dynamic[name].static.value;
	if(!config) config = {};
	if(!config.local){
		for(var r in cpt.refed){
			var from = cpt.refed[r].static.from;
			if(!from) continue;
			var rcpt = getcpt(from, name, {notnew: 1});
			if(rcpt) return rcpt;
		}
	}
	if(!config.notnew){
		var rcpt = newcpt();
		newref(name, cpt, rcpt);
		return rcpt;
	}
}

function vague2call(str, env){
	var vt = {
		active: [['Function', {newfunc: 1}]],
		halfcalls:{},
		halfcalli:0,
		callstodo: [],
		cptstodo: []
	}
	str = str.replace(/^\s*/, "");
	str = str.replace(/\s*$/, "");
	var arr=str.match(/'[^']+'|"[^"]+"|[A-Za-z0-9_]+|[^A-Za-z0-9_'"]+/g);
	walk(arr, 0, env, vt);

	for(var i in vt.cptstodo){
		call(gennativecall("ask", vt.cptstodo[i].static.raw), env)
	}
	


	//halfcalls
	//autofill

	return vt.callstodo;
}
function newhalfcall(cpt, env, vt){
	vt.halfcalls[vt.halfcalli] = {
		func: cpt,		
		args: [],
		argc: 0
	}
	var argdef = cpt.static.argdef;
	for(var i=argdef.length-1;i>=0;i--){
		var conf = argdef[i];
		var type = conf.type || "Cpt";
		vt.active.unshift([type, {funci: vt.halfcalli, argi: i}]);
	}
	vt.halfcalli ++;
	//	log(active);
	//	log(halfcalls)
	var oldcptstodo = vt.cptstodo;
	vt.cptstodo = [];
	for(var i in oldcptstodo){
		doactive(oldcptstodo[i], env, vt);
	}
}
function fillhalfcall(halfcalli, argi, cpt, env, vt){
	var hc = vt.halfcalls[halfcalli];
	hc.args[argi] = cpt2call(cpt, env);
	hc.argc++;
	if(hc.argc == hc.func.static.argdef.length){
		vt.callstodo.push(hc);
		delete vt.halfcalls[halfcalli];
	}
}
function subgettype(proto, cpt, type, env){
	var pr = proto.static.parent || {};
	if(pr[type])
		return cpt;
	var tr = proto.static.transit || {};
	if(tr[type]){
		var trname = "tr"+relpath(proto)+"2"+type;
		var fcpt = getcpt(env, trname, {notnew:1});
		if(!fcpt){
			die(trname + " not exist")
		}
		var rcpt = call({
			func: fcpt,
			args: [
				cpt2call(cpt, env)
			],
			argc: 1
		}, env)
		return rcpt;
	}
}
function gettype(cpt, type, env){
	if(type == "Ori") return cpt;
	if(type == "Cpt"){
		if(cpt.proto.Addr){
			return cpt.static.value;
		}else{
			return cpt;
		}
	}
	if(cpt.proto.Addr){
		if(type == "Addr") return cpt;
		else return gettype(cpt.static.value, type, env);
	}
	
	if(cpt.proto[type]){
		return cpt;
	}
	for(var p in cpt.proto){
		var proto = cpt.proto[p];
		var rcpt = subgettype(proto, cpt, type, env);
		if(rcpt)
			return rcpt;
	}
	for(var key in cpt.static.subs){
		var scpt = getcpt(env, key);
		var sscpt = gettype(scpt, type, env);
		if(sscpt) return sscpt;
		
	}
}
	
function doactive(cpt, env, vt){
	var got = 0;
	for(var i=0; i<vt.active.length;i++){
		var ae = vt.active[i];
		var subcpt = gettype(cpt, ae[0], env);
		if(subcpt){
			if(subdoactive(ae[1], subcpt, env, vt)){
				vt.active.splice(i, 1);
			}
			got = 1;
			cpt = subcpt;
			break;
		}
	}
	if(!got){
		vt.cptstodo.push(cpt);
	}
	return got;
}
function subdoactive(conf, cpt, env, vt){
	if(conf.newfunc){
		newhalfcall(cpt, env, vt);
	}else if(conf.funci!=undefined && conf.argi!=undefined){
		fillhalfcall(conf.funci, conf.argi, cpt, env, vt);
		return 1;
	}else{
		log(conf);
		die("wrongconf")
	}
}
var op = {
	"==": "eq",
	"=": "assign",
	"+": "plus"
}
function walk(arr, arri, env, vt){
	if(arri>arr.length-1){			
		return;
	}
	var e = arr[arri];
	if(op[e]){
		e = op[e];
	}
	var cpt;
	if(e.match(/^\$?[A-Za-z][0-9a-zA-Z]*$/)){
		cpt = getcpt(env, e, {notnew:1});
		if(!cpt){
			cpt = newcpt("Word");
			cpt.static.raw = e;
		}
		doactive(cpt, env, vt);
	}else if(e.match(/[0-9]+(?:\.[0-9]+)?/)){
		cpt = raw2cpt(e);
		doactive(cpt, env, vt);
	}else{
		//0a
		//14 235 23 412
	}
	return walk(arr, arri+1, env, vt);
}
function newcall(aste){
	if(aste.length == 1){
		return ast2call(aste[0]);
	}
	var args = [];
	for(var i=1;i<aste.length;i++){
		var e = aste[i];
		args.push(ast2call(e));
	}
	var callobj = {
		funcpre: ast2call(aste[0]),
		args: args,
		argc: aste.length -1 
	}
	return callobj;
}
function addr2str(addr){
	if(!Object.keys(addr.refed).length) return addr.static.name;
	return addr2str(firstv(addr.refed)) + "." + addr.static.name;
}
function relpath(cpt){
	return Object.keys(cpt.refed)[0];
}
function gennativecall(func, e){

	return {
		func: native[func],
		args: [{raw: e}],
		argc: 1
	}
}
function cpt2call(cpt, env){//
	if(cpt.static.raw)
		return {raw: cpt.static.raw};
	if(cpt.static.name)
		return gennativecall("get", cpt.static.name);
	
	return gennativecall("get", relpath(cpt));
	//TODO
}

function ast2call(ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){
	case "_id":
		cpt = gennativecall("get", e);
		break;
	case "_string":
		cpt = {raw: e};
		break;
	case "_number":
		cpt = {raw: e};
		break;
	case "_vaguecall":
		cpt = gennativecall("vaguecall", e);
		break;
	case "_newcall":
		cpt = newcall(e);
		break;
	case "_block":
		break;
	default:
		log(ast)
		die("wrong ast");
	}
	return cpt;
}

/*
raw
native
calls
 */
function call(callobj, env){
	if("raw" in callobj){
		return raw2cpt(callobj.raw);
	}
	var main = callobj.func;
	if(!main && callobj.funcpre){
		main = call(callobj.funcpre, env);
	}
	if(!main){
		log(callobj)
		die("wrong call");
	}
	var args = [];
	var st = main.static;
	for(var i =0; i<callobj.argc; i++){
		var oriarg = call(callobj.args[i], env);
		var parg = gettype(oriarg, st.argdef[i].type);
		if(!parg){
			log(main)
			log(oriarg)
			log(callobj.args[i])
			log(st.argdef[i])
			die();
		}
		args.push(parg);
	}
	if(main.static.native){
		var rawrtn = main.static.native.apply({
			env: env
		}, args);
		return raw2cpt(rawrtn);
	}
	if(main.static.calls){
		//*
		//pseudo in env
		//gen in env
		//
		for(var i in st.argdef){
			
		}
		for(var i in st.calls){
			var subcall = st.calls[i];
			
		}
		return;
	}
	log(callobj);
	die("wrong callobj");
}
function call2str(){
	
}
function raw2cpt(e){
	if((typeof e) == "object" && ("___iscpt" in e)) return e;
	var cpt = newcpt("Raw");
	if(e === undefined){
		cpt.proto.Undefined = protos.Undefined;
	}else if(typeof e == "string"){
		cpt.proto.String = protos.String;		
	}else if(typeof e == "number"){
		cpt.proto.Number = protos.Number;		
	}
	cpt.static.raw = e;
	return cpt;
}
function die(){
	for(var i in arguments){
		console.error(arguments[i]);
	}
	console.error(getStackTrace());
	process.exit();
}
function getStackTrace(){
  var obj = {};
  Error.captureStackTrace(obj, getStackTrace);
  return obj.stack.toString().replace("[object Object]\n","");
}
function mkdirpSync (p, opts, made) {
  if (!opts || typeof opts !== 'object') {
    opts = { mode: opts };
  }
  var mode = opts.mode;
  var xfs = opts.fs || fs;
  if (mode === undefined) {
    mode = 0777 & (~process.umask());
  }
  if (!made) made = null;
  p = path.resolve(p);
  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  }
  catch (err0) {
    switch (err0.code) {
    case 'ENOENT' :
      made = mkdirpSync(path.dirname(p), opts, made);
      mkdirpSync(p, opts, made);
      break;
      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
    default:
      var stat;
      try {
        stat = xfs.statSync(p);
      }
      catch (err1) {
        throw err0;
      }
      if (!stat.isDirectory()) throw err0;
      break;
    }
  }
  return made;
}
function log(str){
	//	return;
	console.log(__line+":"+__function+":"+__line2);
	console.log(str);
	
}
function vagueparse(str, env){
	
}
function render(str, env){
// init data
	if(!env){
		die("render error not env")
	};
	var win, wout;
//		newref(mainfunc, "env", env);
	var evalstr = "arrayDump=[];push arrayDump '";
	var originstr = str.replace(/\r/g,"");
		//		str = str.
		//			replace(/\s*(\^\^[^=]((?!\$\$).)*\$\$)\s*/g, "$1");
		//replace multiple line [\s but not \n]* [^^] [not =] [not $$]* [$$] [\s*\n] 
	originstr.split(/[\t ]*\^\^(?!=)|\^\^(?==)/).forEach(function(sub, i){
		if(i==0){
			win = "";
			wout = sub || "";
		}else{
			var subs;
			if(sub[0] == '=')
				subs = sub.split(/\$\$/);
			else
				subs = sub.split(/\$\$[ \t]*/);
			win = subs[0];
			wout = subs[1] || "";
			if(!win || win[0] != '=') 
				if(wout[0] == '\n')
					wout = wout.substr(1);
		}	
		wout = wout
			.replace(/\\([\$\^])/g, "$1") //\$ \^ -> $ ^
			.replace(/\\/g, "\\\\")
//			.replace(/\n/g, "\\n");
	
		if(win && win[0] == '='){
			var ms;
			if(win[1] && win[1] == "~"){
				evalstr += (win.replace(/^=~(.+)/, "';push arrayDump &(args.$1); push arrayDump '") + wout);
			}else{
				evalstr += (win.replace(/^=(.+)/, "';push arrayDump $1; push arrayDump '") + wout);
			}
		}else{
			evalstr+=("';"+win+";push arrayDump '"+wout);
		}
	});
	evalstr+="';join arrayDump ''";
//	console.error(evalstr);
	var res = _eval(evalstr, env);

//	var res = _get(_getref(_eval(evalstr, env).value), 'value');
	return res.value;
}

