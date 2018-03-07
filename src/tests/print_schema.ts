import SFGraphQL from '../SFGraphQL';
import express = require('express');
import graphqlHTTP = require('express-graphql');
import { writeFileSync } from 'fs';
import { printSchema } from 'graphql';

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
            writeFileSync('output2.json', JSON.stringify(s));
            return s;
        }).then(s => {
            writeFileSync('./schema.graphql', printSchema(s));
            // tslint:disable-next-line:no-console
            console.log('Created ./schema.graphql');
        });
    } else {
        // tslint:disable-next-line:no-console
        console.log('ERROR, env vars not specified');
    }
