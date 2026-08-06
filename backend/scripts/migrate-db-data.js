import { MongoClient } from 'mongodb';

const SOURCE_URI = 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
const DEST_URI = 'mongodb+srv://sakshidwivedi406_db_user:aramish2026@aramish.jk3o6le.mongodb.net/harekrishna?appName=aramish';

async function migrate() {
    console.log('Connecting to databases...');
    const sourceClient = new MongoClient(SOURCE_URI);
    const destClient = new MongoClient(DEST_URI);

    try {
        await sourceClient.connect();
        await destClient.connect();

        const sourceDb = sourceClient.db();
        const destDb = destClient.db();

        console.log(`Source DB connected: ${sourceDb.databaseName}`);
        console.log(`Destination DB connected: ${destDb.databaseName}`);

        // Get all collections from source
        const collections = await sourceDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections to migrate.`);

        for (const collInfo of collections) {
            const collectionName = collInfo.name;
            
            // Skip system collections
            if (collectionName.startsWith('system.')) {
                console.log(`Skipping system collection: ${collectionName}`);
                continue;
            }

            console.log(`\n--- Migrating collection: ${collectionName} ---`);
            const sourceCol = sourceDb.collection(collectionName);
            const destCol = destDb.collection(collectionName);

            // Drop destination collection if it exists to start fresh
            try {
                await destDb.dropCollection(collectionName);
                console.log(`Dropped existing collection ${collectionName} in destination.`);
            } catch (err) {
                // Ignore NamespaceNotFound errors (code 26)
                if (err.code !== 26) {
                    console.log(`Note: Did not drop collection ${collectionName} (might not exist).`);
                }
            }

            // Fetch all documents from source
            const docs = await sourceCol.find({}).toArray();
            console.log(`Found ${docs.length} documents in source ${collectionName}.`);

            if (docs.length > 0) {
                // Insert into destination
                const result = await destCol.insertMany(docs);
                console.log(`Successfully inserted ${result.insertedCount} documents into destination ${collectionName}.`);
            } else {
                console.log(`Skipped insert for ${collectionName} as it is empty.`);
            }
            
            // We should also copy indexes ideally, but native insert is enough for core data
            // Indexes will be rebuilt by mongoose on application start
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sourceClient.close();
        await destClient.close();
    }
}

migrate();
