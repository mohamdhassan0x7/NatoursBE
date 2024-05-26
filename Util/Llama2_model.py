import requests
import json
import sys


# messeges = []
# messeges.append({
#             "role": "system",
#             "content": """You are mr.Alex, an expert technical assistant who is helping a customer to find best product (laptop, mobile phones, etc) for their needs,
#                         and answer his technical questions, and provide him comparisons if needed,make your answers to the point 
#                         If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. 
#                         If you don't know the answer to a question, please don't share false information."""
#         })



def req (messeges):
    # messeges.append({"role":"user", "content" : prompt})
    endpoint = 'https://api.together.xyz/v1/chat/completions'
    res = requests.post(endpoint, json={
        "model": "meta-llama/Llama-2-7b-chat-hf",
        "max_tokens": 200,
        "temperature": 0.7,
        "top_p": 0.7,
        "top_k": 50,
        "repetition_penalty": 1,
        "stop": [
            "[/INST]",
            "</s>"
        ],
        "messages": messeges,
    }, headers={
        "Authorization": "Bearer c596c0e2ca7bee45c6db99bf5c39e8b84f3f3c124cf078c272376e3468f1c627",
    })
    return res        


def Llama (messeges):
    res = req(messeges)
    res = json.loads(res.text)
    response = res["choices"][0]
    messeges.append(response)
    print(json.dumps(response))

# messeges = sys.argv[1]
messeges = json.loads(sys.argv[1])

Llama(messeges) 


from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Load CSV Files from HDFS into RDD") \
    .getOrCreate()

folder_path = "hdfs://path_to_folder"

csv_rdd = spark.sparkContext.textFile(folder_path)

for line in csv_rdd.take(5):
    print(line)

spark.stop()
