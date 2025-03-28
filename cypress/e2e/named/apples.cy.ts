/// <reference types="cypress" />
context('Apples', () => {
  context('SSR', () => {
    it('apples (/)', () => {
      cy.ssrVisit('/');
      cy.contains('app-started').should('not.exist');
      cy.contains('no apples');
      cy.contains('1 apple');
      cy.contains('5 apples');
      cy.contains('11 apples');
      cy.contains('prefix.oranges.zero');
      cy.contains('regex.ananas_and_bananas.bananas.zero');
      cy.contains('regex.ananas_and_bananas.ananas.zero');
    });
    it('oranges (/oranges)', () => {
      cy.ssrVisit('/oranges');
      cy.contains('app-started').should('not.exist');
      cy.contains('no apples');
      cy.contains('1 apple');
      cy.contains('5 apples');
      cy.contains('11 apples');
      cy.contains('no oranges');
      cy.contains('regex.ananas_and_bananas.bananas.zero');
      cy.contains('regex.ananas_and_bananas.ananas.zero');
    });
    it('bananas (/bananas)', () => {
      cy.ssrVisit('/bananas');
      cy.contains('app-started').should('not.exist');
      cy.contains('no apples');
      cy.contains('1 apple');
      cy.contains('5 apples');
      cy.contains('11 apples');
      cy.contains('prefix.oranges.zero');
      cy.contains('no bananas');
      cy.contains('no ananases');
    });
    it('ananases (/ananases)', () => {
      cy.ssrVisit('/ananases');
      cy.contains('app-started').should('not.exist');
      cy.contains('no apples');
      cy.contains('1 apple');
      cy.contains('5 apples');
      cy.contains('11 apples');
      cy.contains('prefix.oranges.zero');
      cy.contains('no bananas');
      cy.contains('no ananases');
    });
  });
});
