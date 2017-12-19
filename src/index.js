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



var rootenv = newcpt();
rootenv.static.isroot = 1;
var protos = {};
protos.PROTO = getcpt(rootenv, "PROTO");
function defproto(p, ex){
	var cpt = protos[p] = getcpt(rootenv, p);
	protos[p].proto.PROTO = protos.PROTO;
	if(ex)
		ex(cpt);
}
defproto("Function")
defproto("Argdef")
defproto("Block")
defproto("Function")
defproto("Criteria")
defproto("Native")
defproto("Undefined")
defproto("Array")
defproto("String")
defproto("Number")
defproto("Event")
defproto("Word", function(cpt){
	cpt.static.parent = {
		"String": 1
	}
	cpt.static.transit = {
		"File": 1,
		"Addr": 1
	}
});
defproto("Raw");
defproto("Env");
defproto("Identity");
defproto("Addr");
defproto("Exit");

//var rootaddr = newaddr("rootEnv", undefined, rootenv);
//rootaddr.static.name = "rootEnv";
//newaddr = rootenv.

var natives = {};
var makenatives = {};
function deffunc(func, ex, makefunc){
	var argnum = func.length;
	var cpt = newcpt("Function");
	cpt.static.argdef = [];
	for(var i=0; i< argnum; i++){
		cpt.static.argdef.push({i: i, type: "Cpt"});
	}
	if(ex){
		for(var i in ex){
			cpt.static.argdef[i].type = ex[i];
		}		
	}
	cpt.static.native = func;
	cpt.proto.Native = protos.Native;
	var tname = func.name.substr(1);
	cpt.static.name = tname;
	natives[tname] = cpt;

	newaddr(tname, rootenv, natives[tname]);
	if(makefunc){
		makenatives[tname] = makefunc;
	}
	return cpt;
}
/*
deffunc(function _bootstrapDisp(){
	log("bootstrap...");
//	mkdirpSync("mem");
	var btsrc = fs.readFileSync("bootstrap.dp").toString();
	var callobj = str2call(btsrc);
	call(callobj, rootenv);
});
*/
deffunc(function _def(addr, argdef, block){
	var func = newcpt("Function");
	func.static.name = addr.static.name;
	func.static.argdef = argdef.static.raw.argdef;
	func.static.calls = block.static.raw.block;
	addr.static.value = func;
}, ["Addr", "Argdef", "Block"]);
/*
deffunc(function _understand(){
	//simple form
	//authority
	//infer from
});
deffunc(function _expect(criteria, action, priority){
	expect(criteria, action, priority);
}, function(cpt){
	cpt.static.argdef[0].type = "Block"
	cpt.static.argdef[1].type = "Block"
	cpt.static.argdef[2].type = "Number"
});
*/
deffunc(function _assign(left, right){
	//check type, left match right TODO
	left.static.value = right;
	right.refed[left.static.name] = left;
}, ["Addr", "Cpt"], function(left, right){
	return left + " = " + right;
});
/*
deffunc(function _isa(left, right){
}, [Addr, PROTO]function(cpt){
	cpt.static.argdef[0].type = "Addr";
	cpt.static.argdef[1].type = "PROTO";
});
deffunc(function _vagueexec(str){
	var self = this;
	return exec(str, self.env);
});
*/
deffunc(function _exec(str){
	var self = this;
	return exec(str, self.env);
});
deffunc(function _inspect(obj){
	log(obj);
});
deffunc(function _print(obj){
	console.log(obj.static.raw);
});
deffunc(function _printcharcode(obj){
	printcharcode(obj.static.raw)
});
/*
deffunc(function _ask(cpt){
	var self = this;
	var env = this.env;
	//TODO
	interact({
		raw:cpt.static.raw
	}, env);	
});
deffunc(function _vaguecall(aste){
	var self = this;
	vaguecall(aste.static.raw, self.env);
});
*/
deffunc(function _get(id){
	var self = this;
	var addr = id.static.raw;
	var cpt = getcpt(self.env, addr);
	return firstv(cpt.refed);
}, ["String"], function(id){
	return id;
});
deffunc(function _trWord2Addr(word){
	var self = this;
	var addr = word.static.raw;
	var cpt = getcpt(self.env, addr);
	return firstv(cpt.refed);
});
//expect
//delete rule
//Tolarence, -
//Acceptance, -
//Understanding -
//criteria -> function
var expectcpt = newcpt("Array");
var expects = expectcpt.dynamic;

function insert(element, array) {
  array.splice(locationOf(element, array) + 1, 0, element);
  return array;
}
function locationOf(element, array, start, end) {
  start = start || 0;
  end = end || array.length;
  var pivot = start + (end - start) >> 1;
	var refk = array[pivot].static.sortkey;
	var tark = element.static.sortkey;
  if (end-start <= 1)
		return refk>tark ? pivot-1 : pivot;
	if(refk === tark){
		var step;
		if(pivot == array.length){
			step = refk - array[pivot - 1].static.sortkey;
		}else{
			step = array[pivot + 1].static.sortkey - refk;
		}
		element.static.sortkey = refk + step >>1;
		return pivot;
	}
  if(refk < tark){
    return locationOf(element, array, pivot, end);
  }
	return locationOf(element, array, start, pivot);
}
newaddr("expectArray", rootenv, expectcpt);

function expect(criteria, actioncpt, level){
	var cpt = newcpt("Expect");
	cpt.static.criteria = criteria;
	cpt.static.action = actioncpt;
	cpt.static.sortkey = level;
	//criteria to function cpt
	//call to criteria cpt;
	insert(expects, expect);
}

//forall: focus - halfcall - unknown - question - source
//todos -> expects

//->focus
//->
//->sources
//if 
//deftarget(""， );
//join target TODO
//expect(natives.returnTrueFunction, natives.greet, 1024*1024-2);
//expect(natives.returnTrueFunction, natives.greet, 1024*1024);
//flow of think
function newevent(){
}
function fillexpect(todo, exp){

}
function mindloop(identity, env){
	var todos = identity.todos;
	var expects = identity.expects;
	for(var i in todos){
		for(var j in expects){
			if(fillexpect(todos[i], expects[j])){
				break;
			}
		}
	}
}

module.exports = disp;
function disp(str, config){
	if(!config) config = {};
	//	var env = config.env || newenv(rootenv);
	if(!config.user) config.user = process.env.USER;
	var idobj = newid(config.user, rootenv);
	if(config.interactive){
		var cpt = newcpt("Interactive");
		newaddr("interactive", rootenv, cpt);
	}
	exec(str, idobj);
	/*
	var st = idobj.static;
	st.events.push(newevent("input", str));
	//the mind loop
	while(st.events.length){
		var event = st.events.pop();
		doevent(event, idobj);
	}
*/
}

function doevent(e, idobj){
	var st = e.static;
	switch(st.type){
	case "input":
		exec(st.arg, idobj);
		break;
	case "askhalfcall":
		break;
	case "askcpt":
		break;
	default:
		log(e)
		die("wrong type");
	}
	
}
function newevent(type, arg){
	var e = newcpt("Event");
	e.static.type = type;
	e.static.arg = arg;
	return e;
}
function dispold(str, config){
	if(!config) config = {};
	var env = config.env || newenv(rootenv);

	if(config.interactive){
		var cpt = newcpt("Interactive");
		newaddr("interactive", env, cpt);
	}
	if(str == "``"){
		return greet(env);
	}else{
		var rtn = exec(str, env);
		return rtn;
	}
}
function greet(env){
	var rtn = interact({raw: ""}, env);
	if(gettype(rtn, "Exit"))
		return;
	else
		greet(env);
}
function exec(str, env){
	var ast = str2ast(str);
	var callobj = ast2call(ast);
	var rtn = call(callobj, env);
	fs.writeFileSync("tmp.dp", call2str(callobj, env));	
	//autofill targets
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
function str2call(str){
	return ast2call(str2ast(str));
}

var basickeys = ["static", "dynamic", "proto", "refed"];
function extendcpt(cpt, ncpt){
	for(var i in basickeys){
		var bk = basickeys[i];
		for(var key in ncpt[bk])
			cpt[bk] = ncpt[bk];
	}
	//TODO database modify
}

//yes/no
//get definition|choose assumption
//get info within context
function interact(callobj, env, config){
	//generate question
	var qu = call2str(callobj, env);
	var ans = rl.question(qu+">");
	/*
	if(config){
		var suspense = getcpt(env, "suspense", {local:1});
		suspense.static.config = config;
		suspense.static.name = newaddr(raw, env);
	}
*/
	if(!ans){
		var str2 = rl.getRawInput();
		if(str2[0].charCodeAt(0) == 0)
			return newcpt("Exit");
		else
			interact({raw: "type again"}, env);
	}
	//	return ans;
	return exec("`"+ans+"`", env);
}
function newid(name, env){
	var nid = newcpt("Identity");
	nid.static.name = name;
	nid.static.events = [];
	newaddr(name, env, nid);
	return nid;
}
function newenv(env){
	var nenv = newcpt("Env");
	newaddr(undefined, env, nenv);
	return nenv;
}
function newcpt(p){
	var cpt = {
		static: {},
		dynamic: [],
		proto: {},//proto
		refed: {},//
		index: 0,
		exp: {},
		exp2: {},
		___iscpt: 1
	}
	if(p){
		cpt.proto[p] = protos[p];
	}
	return cpt;
}
function newaddr(name, from, value, type){
	if(!name){
		name = "addr"+from.index;
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
//config options: local, notnew
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
		newaddr(name, cpt, rcpt);
		return rcpt;
	}
}
function vague2calls(str, env){
	if(!env) env = newenv(rootenv);
	if(str == " ") return;
	if(str.match(/;/)){
		var strs = str.split(/;/);
		var tcalls = [];
		for(var i in strs){
			var subcalls = vague2calls(strs[i], env);
			for(var j in subcalls){
				tcalls.push(subcalls[j]);
			}
		}
		return tcalls;
	}
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
/*
	for(var key of Object.keys(ts1.dynamic).reverse()){
		var t = ts1.dynamic[key].static.target;
	}
	for(var key of Object.keys(ts2.dynamic).reverse()){
		var t = ts2.dynamic[key].static.target;
	}
*/
	for(var i in vt.cptstodo){
		//fill suspense
		var ctd = vt.cptstodo[i];
		var raw = ctd.static.raw;
		//TODO analyze config base on arr
//		expect();
		interact({
			raw: raw
		}, env);
	}
	//halfcalls
	//autofill
	return vt.callstodo;
}		
function newhalfcall(cpt, env, vt){
	var hc = vt.halfcalls[vt.halfcalli] = {
		halfcalli: vt.halfcalli,
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
	if(argdef.length){
		var oldcptstodo = vt.cptstodo;
		vt.cptstodo = [];
		for(var i in oldcptstodo){
			doactive(oldcptstodo[i], env, vt);
		}
	}
	return hc;
}
function fillhalfcall(halfcalli, argi, cpt, env, vt){
	var hc = vt.halfcalls[halfcalli];
	hc.args[argi] = cpt2call(cpt, env);
	hc.argc++;
	return hc;
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
			if(subdoactive(ae[1], subcpt, env, vt, i)){
				
			}
			got = 1;
			cpt = subcpt;
			break;
		}
	}
	if(!got){
		if(!cpt.proto.Undefined)
			vt.cptstodo.push(cpt);
	}
	return got;
}
function subdoactive(conf, cpt, env, vt, activei){
	var hc;
	if(conf.newfunc){
		hc = newhalfcall(cpt, env, vt);
	}else if(conf.funci!=undefined && conf.argi!=undefined){
		hc = fillhalfcall(conf.funci, conf.argi, cpt, env, vt);
		vt.active.splice(activei, 1);
	}else{
		log(conf);
		die("wrongconf")
	}
	if(hc.argc == hc.func.static.argdef.length){
		vt.callstodo.push(hc);
		delete vt.halfcalls[hc.halfcalli];
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
	if(!addr.static.from) return addr.static.name;
	return addr2str(firstv(addr.static.from.refed)) + "." + addr.static.name;
}
function relpath(cpt){
	return Object.keys(cpt.refed)[0];
}
function gennativecall(funcname, e){
	return {
		funcname: funcname,
		func: natives[funcname],
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
}

function ast2call(ast){
	var c = ast[0];
	var e = ast[1];
	var tcall;
	switch(c){
	case "_id":
		tcall = gennativecall("get", e);
		break;
	case "_string":
		tcall = {raw: e};
		break;
	case "_number":
		tcall = {raw: e};
		break;
	case "_vaguecall":
		tcall = {
			calllist: vague2calls(e)
		}
		break;
	case "_newcall":
		tcall = newcall(e);
		break;
	case "_calllist":
		var arr = [];
		for(var i in e){
			arr.push(ast2call(e[i]));
		}
		tcall = {
			calllist: arr
		}
		break;		
	case "_argdef":
		tcall = {
			raw: {
				argdef: e
			}
		}
		break;
	case "_block":
		var arr = [];
		for(var i in e){
			arr.push(ast2call(e[i]));
		}
		tcall = {
			raw: {
				block: arr
			}
		}
		break;
	default:
		log(ast)
		die("wrong ast");
	}
	return tcall;
}

/*
raw
native
calls
 */
function call(callobj, env){
	if("calllist" in callobj){
		var rtn;
		for(var i in callobj.calllist){
			rtn = call(callobj.calllist[i], env)
		}
		return rtn;
	}	
	if("raw" in callobj){
		return raw2cpt(callobj.raw);
	}
	if(!callobj.func){
		if(callobj.funcpre){
			var premain = call(callobj.funcpre, env);
			callobj.func = gettype(call(callobj.funcpre, env), "Function");
			if(!callobj.func){
				log(callobj);
				die("no main");
			}
		}else if(callobj.funcname){
			var premain = call({
				func: natives.get,
				args: [{raw: callobj.funcname}]
			});
			callobj.func = gettype(call(callobj.funcpre, env), "Function");
			if(!callobj.func){
				log(callobj);
				die("no main");
			}
		}else{
			if(!callobj.func){
				log(callobj)
				die("wrong call");
			}
		}
	}
	var main = callobj.func;
	var args = [];
	var st = main.static;
	for(var i =0; i<st.argdef.length; i++){
		var oriarg = call(callobj.args[i], env);
		var parg = gettype(oriarg, st.argdef[i].type);
		if(!parg){
			log(main)
			log(oriarg)
			log(callobj.args[i])
			log(st.argdef[i])
			die("argument not match "+st.name);
		}
		args.push(parg);
	}
	if(st.native){
		var rawrtn = main.static.native.apply({
			env: env
		}, args);
		return raw2cpt(rawrtn);
	}
	if(st.calls){
		//*
		//pseudo in env
		//gen in env
		//
		var nenv = newenv(env)
		for(var i in st.argdef){
			var sarg = st.argdef[i]
			newaddr(sarg.id, nenv, args[i]);
		}
		var rtn;
		for(var i in st.calls){
			var subcall = st.calls[i];
			rtn = call(subcall, nenv);
		}
		return rtn;
	}
	log(callobj);
	die("wrong callobj");
}
function call2str(tcall, env){
	if("calllist" in tcall){
		var str = "";
		if(tcall.calllist.length == 1)
			return call2str(tcall.calllist[0], env);
		for(var i in tcall.calllist){
			var substr = call2str(tcall.calllist[i], env);
			str += substr + ";\n";
		}
		return str;
	}
	if("raw" in tcall){
		if(typeof tcall.raw == "object")
			return JSON.stringify(tcall.raw);
		else
			return tcall.raw.toString();
	}
	var argstr = [];
	for(var i in tcall.args){
		argstr.push(call2str(tcall.args[i], env));
	}
	if(tcall.func){
		var funcname = tcall.func.static.name;
		if(makenatives[funcname]){
			return makenatives[funcname].apply(undefined, argstr);
		}			
		return funcname + " " + argstr.join(" ");
	}
	return "";
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
	}else if(e.argdef){
		cpt.proto.Argdef = protos.Argdef;
	}else if(e.block){
		cpt.proto.Block = protos.Block;
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
var warns = {
	"not defined": ""
}
function warn(code, param1, param2){
	console.log();
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

