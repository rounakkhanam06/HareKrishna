const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://sakshidwivedi406_db_user:aramish2026@aramish.jk3o6le.mongodb.net/harekrishna?appName=aramish';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    const result = await db.collection('experiencesections').deleteMany({
      _id: { $in: [new ObjectId('69c900ee386933e28f670988'), new ObjectId('6a3923ae7b3077df289eae35')] }
    });
    
    console.log('Deleted count:', result.deletedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
