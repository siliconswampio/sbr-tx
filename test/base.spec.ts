import tape from 'tape'
import Common from '@ethereumjs/common'
import { Transaction, AccessListEIP2930Transaction } from '../src'
import { TxsJsonEntry } from './types'
import { BaseTransaction } from '../src/baseTransaction'
import { privateToPublic } from 'ethereumjs-util'

tape('[BaseTransaction]', function (t) {
  // EIP-2930 is not enabled in Common by default (2021-03-06)
  const common = new Common({ chain: 'mainnet', hardfork: 'berlin' })

  const legacyFixtures: TxsJsonEntry[] = require('./json/txs.json')
  const legacyTxs: BaseTransaction<Transaction>[] = []
  legacyFixtures.slice(0, 4).forEach(function (tx: any) {
    legacyTxs.push(Transaction.fromTxData(tx.data, { common }))
  })

  const eip2930Fixtures = require('./json/eip2930txs.json')
  const eip2930Txs: BaseTransaction<AccessListEIP2930Transaction>[] = []
  eip2930Fixtures.forEach(function (tx: any) {
    eip2930Txs.push(AccessListEIP2930Transaction.fromTxData(tx.data, { common }))
  })

  const zero = Buffer.alloc(0)
  const txTypes = [
    {
      class: Transaction,
      name: 'Transaction',
      values: Array(6).fill(zero),
      txs: legacyTxs,
      fixtures: legacyFixtures,
    },
    {
      class: AccessListEIP2930Transaction,
      name: 'AccessListEIP2930Transaction',
      values: [Buffer.from([1])].concat(Array(7).fill(zero)),
      txs: eip2930Txs,
      fixtures: eip2930Fixtures,
    },
  ]

  t.test('Initialization', function (st) {
    for (const txType of txTypes) {
      let tx = txType.class.fromTxData({}, { common })
      st.equal(
        tx.common.hardfork(),
        'berlin',
        `${txType.name}: should initialize with correct default HF`
      )
      st.ok(Object.isFrozen(tx), `${txType.name}: tx should be frozen by default`)

      const initCommon = new Common({
        chain: 'mainnet',
        hardfork: 'istanbul',
        eips: [2718, 2929, 2930],
      })
      tx = txType.class.fromTxData({}, { common: initCommon })
      st.equal(
        tx.common.hardfork(),
        'istanbul',
        `${txType.name}: should initialize with correct HF provided`
      )

      initCommon.setHardfork('byzantium')
      st.equal(
        tx.common.hardfork(),
        'istanbul',
        `${txType.name}: should stay on correct HF if outer common HF changes`
      )

      tx = txType.class.fromTxData({}, { common, freeze: false })
      tx = txType.class.fromTxData({}, { common, freeze: false })
      st.ok(
        !Object.isFrozen(tx),
        `${txType.name}: tx should not be frozen when freeze deactivated in options`
      )

      // Perform the same test as above, but now using a different construction method. This also implies that passing on the
      // options object works as expected.
      tx = txType.class.fromTxData({}, { common, freeze: false })
      const rlpData = tx.serialize()

      tx = txType.class.fromSerializedTx(rlpData, { common })
      st.ok(Object.isFrozen(tx), `${txType.name}: tx should be frozen by default`)

      tx = txType.class.fromSerializedTx(rlpData, { common, freeze: false })
      st.ok(
        !Object.isFrozen(tx),
        `${txType.name}: tx should not be frozen when freeze deactivated in options`
      )

      tx = txType.class.fromValuesArray(txType.values as any, { common })
      st.ok(Object.isFrozen(tx), `${txType.name}: tx should be frozen by default`)

      tx = txType.class.fromValuesArray(txType.values as any, { common, freeze: false })
      st.ok(
        !Object.isFrozen(tx),
        `${txType.name}: tx should not be frozen when freeze deactivated in options`
      )
    }
    st.end()
  })

  t.test('serialize()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any) {
        st.ok(
          txType.class.fromSerializedTx(tx.serialize(), { common }),
          `${txType.name}: should do roundtrip serialize() -> fromSerializedTx()`
        )
        st.ok(
          txType.class.fromSerializedTx(tx.serialize(), { common }),
          `${txType.name}: should do roundtrip serialize() -> fromSerializedTx()`
        )
      })
    }
    st.end()
  })

  t.test('raw()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any) {
        st.ok(
          txType.class.fromValuesArray(tx.raw(), { common }),
          `${txType.name}: should do roundtrip raw() -> fromValuesArray()`
        )
      })
    }
    st.end()
  })

  t.test('verifySignature()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any) {
        st.equals(tx.verifySignature(), true, `${txType.name}: signature should be valid`)
      })
    }
    st.end()
  })

  t.test('verifySignature() -> invalid', function (st) {
    for (const txType of txTypes) {
      txType.fixtures.slice(0, 4).forEach(function (txFixture: any) {
        // set `s` to zero
        txFixture.data.s = `0x` + '0'.repeat(16)
        const tx = txType.class.fromTxData(txFixture.data, { common })
        st.equals(tx.verifySignature(), false, `${txType.name}: signature should not be valid`)
        st.ok(
          (<string[]>tx.validate(true)).includes('Invalid Signature'),
          `${txType.name}: should return an error string about not verifying signatures`
        )
        st.notOk(tx.validate(), `${txType.name}: should not validate correctly`)
      })
    }
    st.end()
  })

  t.test('sign()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any, i: number) {
        const { privateKey } = txType.fixtures[i]
        if (privateKey) {
          st.ok(tx.sign(Buffer.from(privateKey, 'hex')), `${txType.name}: should sign tx`)
        }
      })
    }
    st.end()
  })

  t.test('getSenderAddress()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any, i: number) {
        const { privateKey, sendersAddress } = txType.fixtures[i]
        if (privateKey) {
          const signedTx = tx.sign(Buffer.from(privateKey, 'hex'))
          st.equals(
            signedTx.getSenderAddress().toString(),
            `0x${sendersAddress}`,
            `${txType.name}: should get sender's address after signing it`
          )
        }
      })
    }
    st.end()
  })

  t.test('getSenderPublicKey()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any, i: number) {
        const { privateKey } = txType.fixtures[i]
        if (privateKey) {
          const signedTx = tx.sign(Buffer.from(privateKey, 'hex'))
          const txPubKey = signedTx.getSenderPublicKey()
          const pubKeyFromPriv = privateToPublic(Buffer.from(privateKey, 'hex'))
          st.ok(
            txPubKey.equals(pubKeyFromPriv),
            `${txType.name}: should get sender's public key after signing it`
          )
        }
      })
    }
    st.end()
  })

  t.test('verifySignature()', function (st) {
    for (const txType of txTypes) {
      txType.txs.forEach(function (tx: any, i: number) {
        const { privateKey } = txType.fixtures[i]
        if (privateKey) {
          const signedTx = tx.sign(Buffer.from(privateKey, 'hex'))
          st.ok(signedTx.verifySignature(), `${txType.name}: should verify signing it`)
        }
      })
    }
    st.end()
  })
})
