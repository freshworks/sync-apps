## SDK Generator

The generator is used to build the client for the IPaaS sync APIs from the swagger specifications.
The generator uses the templates specified to generate the SDK with user preferred customization.
The `/templates` folder contains the templates used by the open-api-generator to generate the sdk client files.

---
**NOTE**

The config.json file contains the necessary configs to run the generator. please refer to the [link](https://openapi-generator.tech/docs/generators/javascript) for more details.

---

### SDK Generation:

#### Prerequisites:

The following needs to be pre-installed in the system before the generation:

    1. Docker
    2. npm 

#### Generation

    1. Build the docker image:
        ```shell
        ./generator-script.sh --build-openapi 
        ```

    2. Run the generator script:
        ```shell
        ./generator-script.sh --generate-js 
        ```

---
**NOTE**

- All the above command needs to be run from the /sdk folder
- The swagger file input and the output folders are hard-coded in the script file to the following:
    swagger file - freshpipe.yaml
    output folder - ipaas-sync

---
