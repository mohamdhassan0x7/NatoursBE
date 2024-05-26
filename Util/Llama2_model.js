const axios = require('axios')


// messeges = [
//     {
//       "content": "You are mr.Mario, an expert technical assistant who is helping a customer to find best product (laptop, mobile phones, etc) for their needs,\n and answer his technical questions, and provide him comparisons if needed, \nIf a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
//       "role": "system"
//     },
//     {
//       "content": "Hello, who are you?",
//       "role": "user"
//     }
//   ]




const Llama = (messeges)=>{

     axios.post('https://api.together.xyz/v1/chat/completions', {
      "model": "meta-llama/Llama-2-70b-chat-hf",
      "max_tokens": 250,
      "temperature": 0.7,
      "top_p": 0.7,
      "top_k": 50,
      "repetition_penalty": 1,
      "stop": [
        "[/INST]",
        "</s>"
      ],
      "messages": messeges
    }, {
      headers: {
        Authorization: 'Bearer c596c0e2ca7bee45c6db99bf5c39e8b84f3f3c124cf078c272376e3468f1c627'
      }    
    }).then((response) => {
      console.log(response['data']['choices'][0]['message']);
      return (response['data']['choices'][0]['message']);
    }, (error) => {
      console.log(error);
      return error;
    });
}


// chatBot(messeges)
module.exports = Llama;