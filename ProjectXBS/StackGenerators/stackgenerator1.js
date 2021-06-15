/*
  Scrapped Stack Generator, doesn't allow easy workflow for XBS creation
  
    StackGenerator#1
  
*/

const StackGenerator = Object.freeze({
	NewPrototype:function(){
    	return {
        	Tokens:[],
			Code:"",
            Current:-1,
            CurrentLine:1,
            PToken:"TK_NONE",
            Token:"TK_NONE",
            Lines:1,
            Block:0,
            Variables:[],
        }
    },
	NewStack:function(Code){
    	let Stack = this.NewPrototype();
    	let Tokens = Lex.Tokenize(Code);
        Stack.Tokens = Tokens;
        Stack.Code = Code;
        for (let v of Tokens){
        	if (v == "TK_RETCHAR"){
            	Stack.Lines++;
            }
        }
        return Stack;
    },
});
