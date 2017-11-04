var version = "6.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var child = require("child_process");

var rootns = newcpt();
var rootref = newref("rootns", undefined, rootns);

var protos = {};
var protolist = ["Function", "Native", "Undefined", "String", "Number", "Raw"];
for(var i in protolist){
	var p = protolist[i];
	protos[p] = getcpt(rootns, p);
}

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
	left.value = right;
	right.refed[left.name] = left;
});
deffunc(function _inspect(obj){
	console.log(obj.static.raw);
});
deffunc(function _vaguecall(aste){
	var self = this;
	vaguecall(aste.static.raw, self.env);
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
		refed: {},
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
	var ref = {
		name: name,
		from: from,
		value: value,
		type: type
	}
	if(value)
		value.refed[name] = ref;
	if(from)
		from.dynamic[name] = ref;
	return ref;
}
function istype(cpt, proto){
	
}
function getcpt(cpt, name, config){
	if(cpt.dynamic[name])
		return cpt.dynamic[name];
	if(!config) config = {};
	if(!config.local){
		for(var r in cpt.refed){
			var from = cpt.refed[r].from;
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
function vaguecall(str, env){
	str = str.replace(/^\s*/, "");
	str = str.replace(/\s*$/, "");
	var arr = str.split(/\s*/);
	var calls = [];
	for(var i in arr){
		vague2exact(arr, i, env, calls);
	}
	return call({
		calls: calls
	}, env);
}
function vaguefill(cpt, arr, env, calls){
}
var op = {
	"=": "eq",
	"+": "plus"
	
}
function vague2exact(arr, i, env, calls){
	var e = arr[i];
	if(op[e]){
		e = op[e]
	}

	if(e == undefined) return;
	var cpt;
	if(e.match(/^\$?[A-Za-z][0-9a-zA-Z]*$/)){
		cpt = getcpt(env, e, {notnew:1});
		if(cpt){
			vaguefill(cpt, arr, env, calls);
			return;
		}
	}
	if(i == arr.length - 1 && calls.length == 0)
		calls.push({calls: [
			{native: native.inspect},
			{raw: e}
		]});
	//as raw

}
function newcall(aste){
	if(aste.length == 1){
		return ast2call(aste[0]);
	}
	var calls = [];
	for(var i in aste){
		var e = aste[i];
		calls.push(ast2call(e));
	}
	var callobj = {
		calls: calls
	}
	return callobj;
}
function ast2call(ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){
	case "_id":
		cpt = {calls: [
			{native: native.get},
			{raw: e}
		]}
		break;
	case "_string":
		cpt = {raw: e};
		break;
	case "_number":
		cpt = {raw: e};
		break;
	case "_vaguecall":
		cpt = {calls: [
			{native: native.vaguecall},
			{raw: e}
		]}
		break;
	case "_newcall":
		cpt = newcall(e);
		break;
	case "_block":
		break;
	case "_subcall":
		break;
	default:
		console.log(ast)
		die("wrong ast");
	}
	return cpt;
}
function call(callobj, env){
	if(callobj.raw){
		return raw2cpt(callobj.raw);
	}
	var calls = callobj.calls;
	var main = calls[0];
	var args = [];
	for(var i=1; i<calls.length; i++){
		args.push(call(calls[i], env));
	}
	if(main.raw){
		console.log("!!!!")
		return raw2cpt(main.raw);
	}
	if(main.native){
		return raw2cpt(main.native.static.native.apply({
			env: env
		}, args));
	}
	if(main.calls){
		var corefunc = call(main, env);
		//*
		//pseudo in env
		//gen in env
		
		for(var i in corefunc.static.calls){
			var subcall = corefunc.static.calls[i];
			
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