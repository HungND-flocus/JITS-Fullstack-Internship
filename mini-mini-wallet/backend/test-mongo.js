const { MongoClient } = require('mongodb');
const uri = "mongodb://hungnguyenduc023_db_user:gXtpcdVBGuDIQnJx@ac-xbcg8ny-shard-00-00.gdjiat4.mongodb.net:27017,ac-xbcg8ny-shard-00-01.gdjiat4.mongodb.net:27017,ac-xbcg8ny-shard-00-02.gdjiat4.mongodb.net:27017/mini-mini-wallet?ssl=true&replicaSet=atlas-3lkehp-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment using standard URL. You successfully connected to MongoDB!");
  } catch(e) {
    console.error("Connection Error:", e.message);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
