import SFGraphQL from './SFGraphQL';

export * from './SFGraphQL';

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

        sfg.connect(options).then(console.log);
    } else {
        // tslint:disable-next-line:no-console
        console.log('ERROR, env vars not specified');
    }
