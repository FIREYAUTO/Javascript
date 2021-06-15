/*{{-=~}}---{{~=-}}*\
    Project "XBS"
    
    Language Structure:
    
    	> Variable Declarations:
        	~ set
            ? set x = 10
    	> Blocks:
        	~ { <Code> }
            ? { set x = 10 }
        > Conditional Statements:
        	~ if, elif, else
            ? if (x == 10) { <Code> } elif (x == 11) { <Code> } else { <Code> }
       	> Arrays & Dictionaries
        	~ (Array) { a,b,c }, (Dictionary) { a=0,b=1,c=2 }
            ? set x = {1,2,3}
        > Indexing
        	~ (Array) {a,b,c}[0], (Dictionary) {a=0,b=1,c=2}["a"] or .a
            ? set x = {"hi"};x[0];set y = {hi="hi"};y.hi;y["hi"];
      	> Strings
        	~ "String", 'String'
            ? set x = "Hello, world!";
       	> Functions
        	~ function <Name>(<Parameters>)
            ? function Test(a,b){ send a + b }
       	> Returns
        	~ send
            ? send 1 + 2
       	> For Loops
        	~ foreach (<Name> in <Array,Dictionary>), foreach (<Name> of <Array,Dictionary>), for (<Variable Declaration>;<Expression>;<Expression>)
            ? for (x in {"Hi"}) { <Code> }
        > While Loops
        	~ while (<Expression>)
            ? while (true) { <Code> }
        > Operators
        	~ +, - , *, /, %, ^, ==, >=, <=, <, >, !=, ! (not), | (or), & (and), -- (Deincrement), ++ (Increment), +=, -=, *=, /=, %=, ^=
        > Globals
        	~ String, Array, Dictionary, Number, Function, ...more later
        > KeyWords
        	~ set, for, in, while, of, type, function, foreach, send
    
\*{{-=~}}---{{~=-}}*/

// {{-=~}} Variables {{~=-}} \\

const RawTokens = {
	"TK_STRING1":"\"",
    "TK_STRING2":"\'",
    "TK_SET":"set",
    "TK_RETCHAR":String.fromCharCode(10),
    "TK_TAB":String.fromCharCode(9),
    "TK_SPACE":" ",
    "TK_FOR":"for",
    "TK_FOREACH":"foreach",
    "TK_WHILE":"while",
    "TK_IN":"in",
    "TK_OF":"of",
    "TK_TYPE":"type",
    "TK_FUNC":"function",
    "TK_SEND":"send",
    "TK_POPEN":"(",
    "TK_PCLOSE":")",
    "TK_BOPEN":"{",
    "TK_BCLOSE":"}",
    "TK_IOPEN":"[",
    "TK_ICLOSE":"]",
    "TK_LINEEND":";",
    "TK_EQ":"=",
    "TK_EQS":"==",
    "TK_LT":"<",
    "TK_GT":">",
    "TK_LEQ":"<=",
    "TK_GEQ":">=",
    "TK_NEQ":"!=",
    "TK_NOT":"!",
    "TK_OR":"|",
    "TK_AND":"&",
    "TK_ADDEQ":"+=",
    "TK_SUBEQ":"-=",
    "TK_MULEQ":"*=",
    "TK_DIVEQ":"/=",
    "TK_MODEQ":"%=",
    "TK_POWEQ":"^=",
    "TK_ADD":"+",
    "TK_SUB":"-",
    "TK_MUL":"*",
    "TK_DIV":"/",
    "TK_MOD":"%",
    "TK_POW":"^",
    "TK_DEINC":"--",
    "TK_INC":"++",
    "TK_COMMENT":"#",
    "TK_COMMENTLONGOPEN":"#>",
    "TK_COMMENTLONGCLOSE":"<#",
    "TK_COMMA":",",
    "TK_DOT":".",
    "TK_NULL":"null",
    "TK_TRUE":"true",
    "TK_FALSE":"false",
    "TK_NONE":"",
    "TK_EOS":"&lt;eos&gt;",
};

// {{-=~}} Error Classes {{~=-}} \\

class InternalError extends Error {
	constructor(Message){
    	super(Message).name = this.constructor.name;
    }
}

class LexError extends Error {
	constructor(Message){
    	super(Message).name = this.constructor.name;
    }
}

// {{-=~}} Main Functions {{~=-}} \\



// {{-=~}} Token Functions {{~=-}} \\

function ToToken(x){
	for (let k in RawTokens){
    	if (RawTokens[k] == x){
        	return k;
        }
    }
    return x;
}

function FromToken(x){
	for (let k in RawTokens){
    	if (k == x){
        	return RawTokens[k];
        }
    }
    return x;
}

function IsLiteralToken(x){
	if (!x.startsWith("(")){return false}
    if (!x.endsWith(")")){return false}
    x = x.slice(1);
    x = x.slice(0,x.length-1);
    return RawTokens.hasOwnProperty(x);
}

// {{-=~}} Tokenizer {{~=-}} \\

const Lex = Object.freeze({
	ErrorTypes:{
    	UnclosedLongComment:function(a,b){
        	return `Unexpected "${a}", expected "${b}" to close long comment`;
        },
        ClosedLongComment:function(a,b){
        	return `Unexpected "${a}", missing "${b}" to open long comment`;
        },
        Expected:function(a,b){
        	return `Expected "${a}", got "${b}"`;
        },
        Unexpected:function(a,b){
        	return `Unexpected "${a}" next to "${b}"`;
        },
    },
    InvalidError:function(Type){
    	throw new InternalError(`ErrorType:${Type} is not a valid ErrorType`)
    },
    ParseErrorArgs:function(Args){
    	for (let k in Args){
        	let v = Args[+k];
            Args[+k] = FromToken(String(v));
        }
    },
    NoStackError:function(Type,Args){
    	this.ParseErrorArgs(Args);
    	let Call = this.ErrorTypes[Type];
        if (!Call){this.InvalidError(Type)}
        throw new LexError(Call(...Args));
    },
    Error:function(Stack,Type,Args){
    	this.ParseErrorArgs(Args);
    	let Call = this.ErrorTypes[Type];
        if (!Call){this.InvalidError(Type)}
        throw new LexError(`[XBS Error, {Line:${Stack.CurrentLine}}] ${Call(...Args)}`);
    },
    RemoveTokens:function(Code){
    	for (let k in RawTokens){
        	let v = RawTokens[k];
            Code = Code.replace(new RegExp(`${k}`,"g"),v);
        }
        return Code;
    },
	Tokenize:function(Code){
    	const Tokens = [];
        let Letters=0,PToken="TK_NONE";
        const CL = Code.length;
        const Append = function(n,x){
        	Tokens[(Tokens.length-1)+n]=x;
            if (n == 0){
            	PToken=x;
            }
        }
        for (let k=0;k<=CL-1;k++){
        	let Raw = Code.substr(k,1);
            let Token = ToToken(Raw);
            if (Raw.length == 1 && Token != Raw){
            	if (Letters > 0){
                	let Behind = Code.substring(k-Letters,k);
                    if (RawTokens.hasOwnProperty(Behind)){
                    	Behind = `(${Behind})`;
                    }
                    Append(1,ToToken(Behind));
            		Letters=0;
                }
                if (Token == "TK_EQ"){
                	if (PToken == "TK_EQ"){
                    	Append(0,"TK_EQS");continue
                    } else if (PToken == "TK_LT"){
                    	Append(0,"TK_LEQ");continue
                    } else if (PToken == "TK_GT"){
                    	Append(0,"TK_GEQ");continue
                    } else if (PToken == "TK_NOT"){
                    	Append(0,"TK_NEQ");continue
                    } else if (PToken == "TK_ADD"){
                    	Append(0,"TK_ADDEQ");continue
                    } else if (PToken == "TK_SUB"){
                    	Append(0,"TK_SUBEQ");continue
                    } else if (PToken == "TK_MUL"){
                    	Append(0,"TK_MULEQ");continue
                    } else if (PToken == "TK_DIV"){
                    	Append(0,"TK_DIVEQ");continue
                    } else if (PToken == "TK_MOD"){
                    	Append(0,"TK_MODEQ");continue
                    } else if (PToken == "TK_POW"){
                    	Append(0,"TK_POWEQ");continue
                    } else {
                    	Append(1,Token);
                    }
                } else if (Token == "TK_GT"){
                	if (PToken == "TK_COMMENT"){
                    	Append(0,"TK_COMMENTLONGOPEN");continue
                    } else {
                    	Append(1,Token);
                    }
                } else if (Token == "TK_COMMENT"){
                	if (PToken == "TK_LT"){
                    	Append(0,"TK_COMMENTLONGCLOSE");continue
                    } else {
                    	Append(1,Token);
                    }
                } else {
                	Append(1,Token);
                }
            } else {
            	if (k >= CL-1){
                	let Behind = Code.substring(k-Letters,k+1);
                    if (RawTokens.hasOwnProperty(Behind)){
                    	Behind = `(${Behind})`;
                    }
            		Append(1,ToToken(Behind));
            		Letters=0;
                    break;
                } else {
                	Letters++;
                }
            }
			PToken = Token;
        }
        Tokens.push("TK_EOS");
        return this.RemoveComments(Tokens);;
    },
    RemoveComments:function(Tokens){
    	let NewTokens = [];
        let Skip = [];
        for (let k in Tokens){
        	k=+k;
            if (Skip.includes(k)){continue}
            let v = Tokens[k];
            if (v == "TK_COMMENT"){ //Short comment removal
            	let kk = k+1;
            	while (Tokens[kk] != "TK_RETCHAR"){ //Skip to the next retchar token
                	if (kk > Tokens.length-1){break}
                	Skip.push(kk);
                    kk++;
                }
                Skip.push(kk);
                continue;
            } else if (v == "TK_COMMENTLONGOPEN"){ //Long comment removal
            	let kk = k+1;
                let Broken = false;
                while (Tokens[kk] != "TK_COMMENTLONGCLOSE"){ //Skip to the closing comment token
                	if (kk > Tokens.length-1 || Tokens[kk]=="TK_EOS"){Broken=true;break}
                    Skip.push(kk);
                    kk++;
                }
                if (Broken){ //No closing long comment token? Throw an error
                	this.NoStackError("UnclosedLongComment",[Tokens[kk],"TK_COMMENTLONGCLOSE"]);
                }
                Skip.push(kk);
                continue;
            } else if (v == "TK_COMMENTLONGCLOSE"){ //No opening long comment token? Throw an error
            	this.NoStackError("ClosedLongComment",["TK_COMMENTLONGCLOSE","TK_COMMENTLONGOPEN"]);
            }
            NewTokens.push(v);
        }
        return NewTokens;
    },
});

// {{-=~}} Stack Generator {{~=-}} \\



// {{-=~}} Parser {{~=-}} \\

/*
Do NOT jump into making advanced parsing when done, make simple parsing and work up from there
*/
