var version = "6.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var child = require("child_process");

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
	"Ref"
];
protos.PROTO = getcpt(rootns, "PROTO");
for(var i in protolist){
	var p = protolist[i];
	protos[p] = getcpt(rootns, p);
	protos[p].proto.PROTO = protos.PROTO;
}
var rootref = newref("rootns", undefined, rootns);

var active = [['Function', {newfunc: 1}]];
var halfcalls = {};
var halfcalli = 0;
var callstodo = [];
var cptstodo = [];
var native = {};
function deffunc(func){
	var argnum = func.length;
	var cpt = newcpt("Function");
	cpt.static.argdef = [];
	for(var i=0; i< argnum; i++){
		cpt.static.argdef.push({id: "arg"+i});
	}
	cpt.static.native = func;
	cpt.proto.Native = protos.Native;
	native[func.name.substr(1)] = cpt;
	return cpt;
}
deffunc(function _assign(left, right){
	left.static.value = right;
	right.refed[left.static.name] = left;
});
deffunc(function _inspect(obj){
	console.log("inspect:");
	console.log(obj);
});
deffunc(function _print(obj){
	console.log(obj.static.raw);
});
deffunc(function _vaguecall(aste){
	var self = this;
	var calls = vaguecall(aste.static.raw, self.env);
	for(var i in calls){
		call(calls[i], self.env);
	}
});
deffunc(function _get(id){
	console.log(id)
});


for(var key in native){
	newref(key, rootns, native[key]);
}
module.exports = function(str){
	log("input", str);
	var ast = str2ast(str);
	log("ast", ast);
	var callobj = ast2call(ast);
	var env = newenv(rootns);
	call(callobj, env);
}
function str2ast(str){
	if(str == undefined || str == null || str == "") return;
	return parser.parse(str);
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
		index: 0
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
	var ncpt = newcpt("Ref");
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
/*
cpt -> each exp -> new/fill exp -> mod exp
                -> new cpt 
final: each cpt     -> exp
       unfilled exp -> fill with env -> cpt .. it
*/
function input(cpt){
	var self = this;
	for(var i in active){
		var tarcpt = active[i];
		var matchtar = 0;

		active.push(matchtar);
		break;
	}
}
function vaguecall(str, env){
	str = str.replace(/^\s*/, "");
	str = str.replace(/\s*$/, "");
	var arr = str.split(/\s+/);
	walk(arr, 0, env);
	var calls = [];
	for(var i = 0; i < callstodo.length; i++){
		var thecall = callstodo[i];
		if(thecall)
			calls.push(thecall);
	}
	if(!calls.length){
		for(var i=cptstodo.length-1;i>=0;i--){
			calls.push(gennativecall("inspect", cptstodo[i].static.raw));
		}
	}
	return calls;
}
function newhalfcall(cpt){
	halfcalls[halfcalli] = {
		func: cpt,		
		args: [],
		argc: 0
	}
	for(var i in cpt.static.argdef){
		active.push(['Cpt', {funci: halfcalli, argi: i}]);
	}
	halfcalli ++;
	
}
function fillhalfcall(halfcalli, argi, cpt, env){
	var hc = halfcalls[halfcalli];
	hc.args[argi] = cpt2call(cpt, env);
	hc.argc++;
	if(hc.argc == hc.func.static.argdef.length){
		callstodo.push(hc);
		delete halfcalls[halfcalli];
	}else{
		//auto fill half calls
	}
}
function subgettype(proto, cpt, type, env){
	var pr = proto.static.parent || {};
	if(pr[type])
		return cpt;
	var tr = proto.static.transit || {};
	if(tr[type]){
		var rcpt = call({
			func: ['_id', 'tr'+relpath(proto)+'2'+type],
			args: [
				cpt2call(cpt, env)
			],
			argc: 1
		})
		return rcpt;
	}
}
function gettype(cpt, type, env){
	if(type == "Cpt") return cpt;
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
function doactive(conf, cpt, env){
	if(conf.newfunc){
		newhalfcall(cpt, env);
	}else if(conf.funci!=undefined && conf.argi!=undefined){
		fillhalfcall(conf.funci, conf.argi, cpt, env);
		return 1;
	}else{
		console.log(conf);
		die("wrongconf")
	}
}
var op = {
	"=": "eq",
	"+": "plus"
}
function walk(arr, arri, env){
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
		var got = 0;
		for(var i=active.length - 1;i>=0;i--){
			var ae = active[i];
			var subcpt = gettype(cpt, ae[0]);
			if(subcpt){
				if(doactive(ae[1], subcpt, env)){
					active.splice(i, 1);
				}
				got = 1;
				break;
			}
		}
		if(!got){
			cptstodo.push(cpt);
		}
	}else{
		//0a
		//14 235 23 412
	}
	return walk(arr, arri+1, env);
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
function relpath(cpt){
	return Object.keys(cpt.refed)[0].name;
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
		console.log(ast)
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
		console.log(callobj)
		die("wrong call");
	}
	var args = [];
	for(var i =0; i<callobj.argc; i++){
		args.push(call(callobj.args[i], env));
	}
	if(main.static.native){
		return raw2cpt(main.static.native.apply({
			env: env
		}, args));
	}
	if(main.static.calls){
		var st = main.static;
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
	console.log(callobj);
	die("wrong callobj");		
}
function call2str(){
	
}
function raw2cpt(e){
	var cpt = newcpt("Raw");
	if(e === undefined){
		cpt.proto.Undefined = protos.Undefined;
	}else if(typeof e == "string"){
		cpt.proto.String = protos.String;
		
	}else if(e.static && e.dynamic){
		return e;
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
function log(a, b){
//	return;
	console.log("!"+a+":");
	console.log(b);
	
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
