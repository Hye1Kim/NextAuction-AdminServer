
module.exports = {
    'service-registry': {
          'type': 'klaytn', 
          'id': 'auction-3', //before auction-2
          'access-perm': {
              'endpoint': 'https://api.baobab.klaytn.net:8651',//'ws://203.250.77.150:8546',
              'account': '0x67a134358367ba2f20098bd80a3064d7f55965dc',
              'password': '7069mcor!!',//'1234',
              'private-key': '0x6eeb0482ca6ed722378becdcd58b23d611eaa5c37e66a0cb72c89a3c47cab3a5',
              'contract': {
              	'json-interface-path': `${__dirname}/../res/test.json`, //?
              	'address': '0x79d4008d19eaea49a9acc9f4b14b0b2dd496c2ae' //?
              }
          }
     },
    'state-config': {
        'version-up-size': 1000000000,
        'state-path': `${__dirname}/../state`,
        'max-state-version': 1000,
        'state-mode': 'default', //cold start
        'backup-storage-type': 'mysql',
        'backup-storage-auth': {
          'host': '203.250.77.154',
          'user': 'pslab',
          'password': 'pslab',
          'database': 'backup'
        },
    },
    'webpack-config': ''
}
