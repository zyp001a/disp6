var jison = require("jison");
var fs = require("fs");
var grammar = {
  "lex": {
    "macros": {
      "digit": "[0-9]",
			"letter": "[a-zA-Z_]",
      "esc": "\\\\",
      "int": "-?(?:[0-9]|[1-9][0-9]+)",
      "exp": "(?:[eE][-+]?[0-9]+)",
      "frac": "(?:\\.[0-9]+)",
			"sp": "[ \\t]*",
			"sp2": "[ \\t\\n\\r]*"
    },
    "rules": [
			["{sp}\`(\\.|[^\\\`])*\`{sp}", 
			 "yytext = yytext.replace(/^\\s*\`/, '').replace(/\`\\s*$/, ''); return 'VAGUE';"],
			["\\/\\*[\\S\\s]*\\*\\/", "return;"],//COMMENT
			["\\#[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["\\\/\\\/[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["{sp}\"(\\.|[^\\\"])*\"{sp}", 
			 "yytext = yytext.replace(/^\\s*\"/, '').replace(/\"\\s*$/, ''); return 'STRING';"],
			["{sp}\'(\\.|[^\\\'])*\'{sp}",
       "yytext = yytext.replace(/^\\s*\'/, '').replace(/\'\\s*$/, ''); return 'STRING';"],
      ["{sp}\\\\[\\r\\n;]+{sp}", "return"],//allow \ at end of line
      ["{sp}{int}{frac}?{exp}?\\b{sp}",
			 "yytext = yytext.replace(/\\s/g, ''); return 'NUMBER';"],
			["{sp}\\$?{letter}({letter}|{digit})*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
			["{sp}\\${digit}*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
      ["{sp}\\.{sp}", "return '.'"],
      ["{sp}\\({sp2}", "return '('"],
      ["{sp2}\\){sp}", "return ')'"],
      ["{sp}\\[{sp2}", "return '['"],
      ["{sp2}\\]{sp}", "return ']'"],
      ["{sp}\\{{sp2}", "return '{'"],
      ["{sp2}\\}{sp}", "return '}'"],
			["{sp}\\=\\~{sp2}", "return '=~'"],
			["{sp}\\=\\?{sp2}", "return '=?'"],
			["{sp}\\=\\:{sp2}", "return '=:'"],
			["{sp}\\=\\>{sp2}", "return '=>'"],
			["{sp}\\>\\={sp2}", "return '>='"],
			["{sp}\\<\\={sp2}", "return '<='"],
			["{sp}\\=\\={sp2}", "return '=='"],
			["{sp}\\!\\={sp2}", "return '!='"],
			["{sp}\\+\\={sp2}", "return '+='"],
			["{sp}\\-\\={sp2}", "return '-='"],
			["{sp}\\*\\={sp2}", "return '*='"],
			["{sp}\\/\\={sp2}", "return '/='"],
			["{sp}\\|\\|{sp2}", "return '||'"],
			["{sp}\\&\\&{sp2}", "return '&&'"],
			["{sp}\\:\\:{sp2}", "return '::'"],
      ["{sp}\\>\\>{sp2}", "return '>>'"],
			["{sp}\\<\\<{sp2}", "return '<<'"],
      ["{sp}\\>{sp2}", "return '>'"],
      ["{sp}\\<{sp2}", "return '<'"],
      ["{sp}\\&{sp}", "return '&'"],
      ["{sp}\\@{sp}", "return '@'"],
      ["{sp}\\|{sp}", "return '|'"],
			["{sp}\\!{sp}", "return '!'"],
			["{sp}={sp}", "return '='"],
			["{sp}\\+{sp2}", "return '+'"],
			["{sp}\\-{sp2}", "return '-'"],
			["{sp}\\*{sp2}", "return '*'"],
			["{sp}\\/{sp2}", "return '/'"],
			["{sp}\\%{sp}", "return '%'"],
			["{sp}\\^{sp}", "return '^'"],
			["{sp}\\.{sp2}", "return '.'"],
			["{sp}\\:{sp2}", "return ':'"],
      ["{sp},{sp2}", "return ','"],
      ["{sp}\\~{sp2}", "return '~'"],
			["{sp}\\_{sp}", "return '_'"],
      ["{sp}[\\r\\n;]+{sp}", "return ';'"]
    ]
  },
	"operators": [
    ["right", "=", "+=", "-=", "*=", "/=", ":="],
		["left", "<", ">", ">=", "<=", "==", "!="],
		["left", "=~"],
		["left", ","],
    ["left", "||"],
    ["left", "&&"],
    ["left", "+", "-"],
    ["left", "*", "/", "%"],
    ["right", "&", "|", "@", "~", "%", "@!"],
    ["right", "!"],
		["left", ".", ":"]
	],
  "start": "Block",
  "bnf": {
		"Block": [
			["ExpEx", "return $$ = $1"],
			["ExpEx ;", "return $$ = $1"]
		],
		"Id": [
			["ID", "$$ = ['_id', $1]"],
			["@ ID", "$$ = ['_local', $2]"]
		],
		"L": [//word
			["Id", "$$ = $1"],
			["Id : ID", "$$ = $1; $$[2] = $3"],
			["STRING", "$$ = ['_string', $1]"],
			["NUMBER", "$$ = ['_number', Number($1)]"]
		],
		"Ln": [
			["L", "$$ = $1;"],
			["GetOp", "$$ = $1;"],
			["ExpUnit", "$$ = $1;"],
			["( Exp )", "$$ = $2;"],
			["ArgDef", "$$ = $1"]
		],
		"Lss": [
			["L", "$$ = ['_newcall', [$1]]"],
			["Lss Ln", "$$ = $1; $1[1].push($2)"]
		],
		"Key": [
			["ID", "$$ = ['_string', $1]"],
			["STRING", "$$ = ['_string', $1]"],
			["NUMBER", "$$ = ['_number', $1]"],
			["( Exp )", "$$ = $2"]
		],
		"GetOp": [
			["Id . Key", "$$ = ['_newcall', [['_id', 'get'], $1, $3]]"],
			["( Exp ) . Key", "$$ = ['_newcall', [['_id', 'get'], $2, $5]]"],
			["GetOp . Key", "$$ = ['_newcall', [['_id', 'get'], $1, $3]]"]
		],
		"ExpEx": [
			["Exp", "$$ = $1"],
			["VAGUE", "$$ = ['_vaguecall', $1]"]
		],
		"ExpList": [
			["ExpEx",  "$$ = [$1];"],  //artical
			["; ExpEx",  "$$ = [$2];"],
			["ExpList ; ExpEx", "$$ = $1; $1.push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = [];"]
		],
		"Exp": [//sentence
			["( Exp )", "$$ = $2"],
			["Lss", "$$ = $1;"],
			["ExpUnit", "$$ = $1"],
			["Op", "$$ = $1"]
		],
		"Op": [
			["! Exp", "$$ = ['_newcall', [['_id', 'not'], $2]]"],
			["Exp = Exp", "$$ = ['_newcall', [['_id', 'assign'], $3, $1]]"],
			["Exp + Exp", "$$ = ['_newcall', [['_id', 'plus'], $1, $3]]"],
			["Exp - Exp", "$$ = ['_newcall', [['_id', 'minus'], $1, $3]]"],
			["Exp * Exp", "$$ = ['_newcall', [['_id', 'times'], $1, $3]]"],
			["Exp / Exp", "$$ = ['_newcall', [['_id', 'obelus'], $1, $3]]"],
			["Exp += Exp", "$$ = ['_newcall', [['_id', 'assign'], ['_newcall', [['_id', 'plus'], $1, $3]], $1]]"],
			["Exp >= Exp", "$$ = ['_newcall', [['_id', 'ge'], $1, $3]]"],
			["Exp <= Exp", "$$ = ['_newcall', [['_id', 'le'], $1, $3]]"],
			["Exp == Exp", "$$ = ['_newcall', [['_id', 'eq'], $1, $3]]"],
			["Exp != Exp", "$$ = ['_newcall', [['_id', 'ne'], $1, $3]]"],
			["Exp > Exp", "$$ = ['_newcall', [['_id', 'gt'], $1, $3]]"],
			["Exp < Exp", "$$ = ['_newcall', [['_id', 'lt'], $1, $3]]"],
			["GetOp", "$$ = $1"]
		],
		"ExpUnit": [
			["Brace", "$$ = ['_block', $1]"]
		],
		"Brace": [
			["{ ExpList }", "$$ = $2"],
			["{ }", "$$ = []"]
		],
    "IdstrArray": [
      ["ID", "$$ = [{id: $1}]"],
      ["ID : ID", "$$ = [{id: $1, type: $3}]"],
      ["IdstrArray , ID", "$$ = $1, $1.push({id:$3})"],
      ["IdstrArray , ID : ID", "$$ = $1, $1.push({id:$3, type:$5})"]
    ],
		"ArgDef": [
			["[ IdstrArray ]", "$$ = ['_argdef', $2]"]
		]
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

