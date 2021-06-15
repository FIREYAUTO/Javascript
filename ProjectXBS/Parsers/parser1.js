/*
    A scrapped parser, didn't follow guidelines for an easy workflow for creating XBS
    
      Parser#1
      
*/

const Parser = Object.freeze({
	Next:function(Stack){
    	if (Stack.Jumps > 0){
        	Stack.Jumps--;
        }
    	Stack.Current++;
        Stack.PToken=Stack.Token;
        Stack.Token=Stack.Tokens[Stack.Current];
        if (Stack.Token == "TK_RETCHAR"){
        	Stack.CurrentLine++;
        }
    },
    Check:function(Stack,Token){
    	if (Stack.Token != Token){
        	Lex.Error(Stack,"Expected",[Token,Stack.Token]);
        }
    },
    CheckNext:function(Stack,Token){
    	this.Check(Stack,Token);
        this.Next(Stack);
    },
    NextCheck:function(Stack,Token){
    	this.Next(Stack);
    	this.Check(Stack,Token);
    },
	Start:function(Code){
    	let Stack = StackGenerator.NewStack(Code);
        this.Chunk(Stack);
    	return Stack;
    },
    Jump:function(Stack,Amount){
    	for (let i=1;i<=Amount;i++){
        	this.Next(Stack);
        }
    	Stack.Jump = Amount;
    },
    JumpIfToken:function(Stack,Token){
    	while (Stack.Token == Token){
        	this.Jump(Stack,1);
        }
    },
    JumpIfTokens:function(Stack,Tokens){
    	while (Tokens.includes(Stack.Token)){
        	this.Jump(Stack,1);
        }
    },
    // {{ Variables }} \\
    NewVariablePrototype:function(Stack){
    	return {
        	Name:"",
            Value:"TK_NULL",
            DefinedOn:Stack.CurrentLine,
            Block:Stack.Block,
            Creation:"VSET",
        };
    },
    GetHighestVariable:function(Stack,Name){
    	let Var = undefined;
        for (let v of Stack.Variables){
        	if (!Var || v.Block >= Stack.Block){
            	Var = v;
            }
        }
        return Var;
    },
    AddVariable:function(Stack,Name,Value){
    	let Var = this.GetHighestVariable(Stack,Name);
        if (!Var || Var.Block != Stack.Block){
        	Var = this.NewVariablePrototype(Stack);
            Var.Name = Name;
            Var.Creation = "VSET";
        }
        Var.Value = Value;
        Stack.Variables.push(Var);
        return Var;
    },
    SetVariable:function(Stack,Name,Value){
    	let Var = this.GetHighestVariable(Stack,Name);
        if (!Var){ //Attempt to set variable without TK_SET or .Assignment state called
        	Var = this.NewVariablePrototype(Stack);
            Var.Creation = "VSET";
            Var.Name = Name;
            Var.Value = Value;
            Stack.Variables.push(Var);
        } else {
        	Var.Creation = "VASSIGN",
        	Var.Value = Value;
        }
        return Var;
    },
    // {{ Parser Expressions }} \\
    SimpleExpression:function(Stack){
    	//Do later, parse simple expressions
    },
    AdvancedExpression:function(Stack){
    	//TODO: Advanced Expression is for variables and statements
    },
    // {{ Parser States Start }} \\
    States:Object.freeze({
    	Assignment:function(Stack,VarName){
        	Parser.JumpIfToken(Stack,"TK_SPACE");
            Parser.CheckNext(Stack,"TK_EQ");
            Parser.JumpIfToken(Stack,"TK_SPACE");
        	let Value = Parser.AdvancedExpression(Stack);
            let Var = Parser.SetVariable(Stack,VarName,Value);
        	return Var;
        },
    	Set:function(Stack){
        	Parser.Next(Stack);
        	Parser.CheckNext(Stack,"TK_SPACE");
            Parser.JumpIfToken(Stack,Stack.PToken);
            let VarName = Stack.Token;
            Parser.Next(Stack);
            Parser.JumpIfToken(Stack,"TK_SPACE");
            let Variable = this.Assignment(Stack,VarName); //Call assignment state with varname
            Variable.Creation = "VSET";
        },
    }),
    // {{ Parser States End }} \\
    Parse:function(Stack){ //Main Parse function
    	let Token = Stack.Token;
        if (Token == "TK_SET"){
        	this.States.Set(Stack);   
        } else {
        	this.SimpleExpression(Stack);
        }
    },
    Chunk:function(Stack){ //Chunk, used to loop through the entire script
    	this.Next(Stack) //Start the Stack off at the first token
        this.JumpIfTokens(Stack,["TK_RETCHAR","TK_SPACE","TK_TAB"]);
    	while (Stack.Current <= Stack.Tokens.length-1 && Stack.Token != "TK_EOS"){
        	if (Stack.Token == "TK_EOS"){break}; //Check if the script is at the end
            this.Parse(Stack);
            this.Next(Stack);
            this.CheckNext(Stack,"TK_LINEEND"); //Check if there is a line end, will error if their isn't.
            this.JumpIfToken(Stack,"TK_RETCHAR");
        }
    }
})
// {{-=~}} Main Functions {{~=-}} \\

let Code = `set x = 1;`;

const Stack = Parser.Start(Code);
document.write(Stack.Variables[0].Name);
