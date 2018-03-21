import SFGraphQL from '../SFGraphQL';
import express = require('express');
import graphqlHTTP = require('express-graphql');

// Some test code
if (process.env.SF_USER
    && process.env.SF_PASS
    && process.env.SF_URL
    && process.env.SF_ENV) {
        const sfg = new SFGraphQL(process.env.SF_USER, process.env.SF_PASS);
        const options = {
            loginUrl: process.env.SF_URL,
            instanceUrl: process.env.SF_ENV,
        };

        sfg.buildSchema(options).then(s => {
            const app = express();
            app.use('/graphql', graphqlHTTP({
                schema: s,
                graphiql: true,
            }));
            app.listen(4000);
            // tslint:disable-next-line:no-console
            console.log('Running api server at localhost:4000/graphql');
        });
    } else {
        // tslint:disable-next-line:no-console
        console.log('ERROR, env vars not specified');
    }
