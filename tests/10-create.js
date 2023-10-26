/*!
 * Copyright 2023 Digital Bazaar, Inc. All Rights Reserved
 */
import {
  shouldBeBs58, shouldBeMulticodecEncoded, verificationSuccess
} from './assertions.js';
import chai from 'chai';
import {
  checkDataIntegrityProofFormat
} from 'data-integrity-test-suite-assertion';
import {createInitialVc} from './helpers.js';
import {documentLoader} from './documentLoader.js';
import {endpoints} from 'vc-test-suite-implementations';
import {validVc as vc} from './validVc.js';

const tag = 'ecdsa-2019';
const cryptosuite = 'ecdsa-2019';
const {match} = endpoints.filterByTag({
  tags: [tag],
  property: 'issuers'
});
const should = chai.should();

describe('ecdsa-2019 (create)', function() {
  checkDataIntegrityProofFormat({
    implemented: match
  });
  describe('ecdsa-2019 (issuer)', function() {
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Implementation';
    for(const [name, {endpoints, implementation}] of match) {
      describe(name, function() {
        const [issuer] = endpoints;
        const verifier = implementation.verifiers.find(
          v => v.tags.has(tag));
        let issuedVc;
        let proofs;
        const verificationMethodDocuments = [];
        before(async function() {
          issuedVc = await createInitialVc({issuer, vc});
          proofs = Array.isArray(issuedVc?.proof) ? issuedVc.proof :
            [issuedVc?.proof];
          const verificationMethods = proofs.map(
            proof => proof.verificationMethod);
          for(const verificationMethod of verificationMethods) {
            const verificationMethodDocument = await documentLoader({
              url: verificationMethod
            });
            verificationMethodDocuments.push(verificationMethodDocument);
          }
        });
        it('The field "cryptosuite" MUST be "ecdsa-2019".', function() {
          this.test.cell = {columnId: name, rowId: this.test.title};
          proofs.some(
            proof => proof?.cryptosuite === cryptosuite
          ).should.equal(
            true,
            'Expected at least one proof to have "cryptosuite" property ' +
            '"ecdsa-2019".'
          );
        });
        it('The "proof" MUST verify when using a conformant verifier.',
          async function() {
            this.test.cell = {columnId: name, rowId: this.test.title};
            should.exist(verifier, 'Expected implementation to have a VC ' +
              'HTTP API compatible verifier.');
            verificationSuccess({credential: issuedVc, verifier});
          });
        it('Dereferencing "verificationMethod" MUST result in an object ' +
          'containing a type property with "Multikey" value.',
        async function() {
          this.test.cell = {columnId: name, rowId: this.test.title};
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            '"verificationMethodDocuments" to not be empty.');
          verificationMethodDocuments.some(
            verificationMethodDocument =>
              verificationMethodDocument?.type === 'Multikey'
          ).should.equal(
            true,
            'Expected at least one proof to have "type" property value ' +
              '"Multikey".'
          );
        });
        it('The "controller" of the verification method MUST exist and MUST ' +
          'be a valid URL.', async function() {
          this.test.cell = {columnId: name, rowId: this.test.title};
          verificationMethodDocuments.should.not.eql(0, 'Expected ' +
            '"verificationMethodDocuments" to not be empty.');
          verificationMethodDocuments.forEach(verificationMethodDocument => {
            should.exist(verificationMethodDocument, 'Expected dereferencing ' +
              '"verificationMethod" to return a document.');
            const {controller} = verificationMethodDocument;
            should.exist(controller, 'Expected "controller" of the ' +
              'verification method to exist.');
            let result;
            let err;
            try {
              result = new URL(controller);
            } catch(e) {
              err = e;
            }
            should.not.exist(err, 'Expected URL check of the "controller" of ' +
              'the verification method to not error.');
            should.exist(result, 'Expected the controller of the ' +
              'verification method to be a valid URL.');
          });
        });
        it('The "publicKeyMultibase" property of the verification method ' +
          'MUST be public key encoded according to MULTICODEC and formatted ' +
          'according to MULTIBASE.', async function() {
          this.test.cell = {columnId: name, rowId: this.test.title};
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            '"verificationMethodDocuments" to not be empty.');
          verificationMethodDocuments.some(
            verificationMethodDocument => {
              const multibase = 'z';
              const {publicKeyMultibase} = verificationMethodDocument;
              return publicKeyMultibase.startsWith(multibase) &&
                shouldBeBs58(publicKeyMultibase) &&
                shouldBeMulticodecEncoded(publicKeyMultibase);
            }
          ).should.equal(
            true,
            'Expected at "publicKeyMultibase" to to be MULTIBASE formatted ' +
            'and MULTICODEC encoded.'
          );
        });
      });
    }
  });
});