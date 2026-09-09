import { describe, expect, it } from 'vitest';
import { buildRequestFragment, buildRequestLink, isRequestLink, parseRequestLink } from './link';

describe('parseRequestLink', () => {
  it('reads purpose, recipient and fields from the fragment', () => {
    const link = parseRequestLink('#purpose=lodging&to=Sakura%20Guest%20House&keep=photo,name');
    expect(link).toEqual({ purpose: 'lodging', recipient: 'Sakura Guest House', keep: ['photo', 'name'] });
    expect(isRequestLink(link)).toBe(true);
  });

  it('drops unknown purposes and fields instead of trusting them', () => {
    const link = parseRequestLink('#purpose=hack&keep=photo,ssn,name,name');
    expect(link.purpose).toBeUndefined();
    expect(link.keep).toEqual(['photo', 'name']);
  });

  it('sanitizes and truncates the recipient', () => {
    const link = parseRequestLink(`#to=${encodeURIComponent('  A B   ' + 'x'.repeat(100))}`);
    expect(link.recipient?.startsWith('A B x')).toBe(true);
    expect(link.recipient?.length).toBe(60);
  });

  it('returns an empty link for no fragment or garbage', () => {
    expect(parseRequestLink('')).toEqual({ keep: [] });
    expect(parseRequestLink('#')).toEqual({ keep: [] });
    expect(isRequestLink(parseRequestLink('#view=business'))).toBe(false);
    expect(parseRequestLink('#view=business').view).toBe('business');
  });

  it('keeps the custom purpose text for "other"', () => {
    expect(parseRequestLink('#purpose=other&custom=%E4%BC%9A%E5%93%A1%E7%99%BB%E9%8C%B2')).toMatchObject({
      purpose: 'other',
      customPurpose: '会員登録',
    });
  });
});

describe('buildRequestLink', () => {
  it('round-trips through parseRequestLink', () => {
    const fragment = buildRequestFragment({
      purpose: 'rental',
      recipient: 'ABC 不動産',
      keep: ['photo', 'name', 'address', 'address'],
    });
    expect(parseRequestLink(fragment)).toEqual({
      purpose: 'rental',
      recipient: 'ABC 不動産',
      keep: ['photo', 'name', 'address'],
    });
  });

  it('puts everything in the fragment, never in the path or query', () => {
    const url = buildRequestLink('https://example.test/', { purpose: 'lodging', recipient: 'X', keep: [] });
    expect(url.startsWith('https://example.test/#')).toBe(true);
    expect(url).not.toContain('?');
  });
});
