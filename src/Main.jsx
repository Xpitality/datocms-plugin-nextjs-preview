import React, { Component } from 'react';
import PropTypes from 'prop-types';

import connectToDatoCms from './connectToDatoCms';
import './style.scss';

const replacementFieldRegex = /\$[a-zA-Z_]+/g;

@connectToDatoCms(plugin => ({
  developmentMode: plugin.parameters.global.developmentMode,
  fieldValue: plugin.getFieldValue(plugin.fieldPath),
  plugin,
}))
export default class Main extends Component {
  static propTypes = {
    plugin: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      fields: {},
      locales: props.plugin.site.attributes.locales,
      selectedLocale: props.plugin.site.attributes.locales[0],
    };
  }

  componentDidMount() {
    const { plugin } = this.props;
    const matches = this.getPathReplacementFields();

    if (matches) {
      const fields = {};
      this.unsubscribers = [];

      // Subscribe to changes for all fields that are used in the path
      matches.forEach((m) => {
        fields[m] = plugin.getFieldValue(m);
        this.unsubscribers.push(plugin.addFieldChangeListener(m, (value) => {
          this.setState(s => ({
            ...s,
            fields: {
              ...s,
              [m]: value,
            },
          }));
        }));
      });

      this.setState({ fields });
    }
  }

  componentWillUnmount() {
    if (this.unsubscribers) {
      this.unsubscribers.forEach(unsub => unsub());
    }
  }

  getPathReplacementFields() {
    // eslint-disable-next-line react/destructuring-assignment
    const matches = this.props.plugin.parameters.instance.entityPath.match(replacementFieldRegex);
    return matches && matches.map(m => m.replace('$', ''));
  }

  getEntityPath() {
    const { plugin } = this.props;
    const { fields, selectedLocale } = this.state;
    let { entityPath } = plugin.parameters.instance;

    Object.entries(fields).forEach(([field, value]) => {
      entityPath = entityPath.replace(`$${field}`, typeof value === 'object' ? value[selectedLocale] : value);
    });

    return entityPath;
  }


  render() {
    const { plugin } = this.props;
    const { locales, selectedLocale } = this.state;
    const { primaryColor } = plugin.theme;
    const {
      parameters: {
        global: {
          instanceUrl,
          previewPath,
          previewSecret,
        },
      },
    } = plugin;

    if (plugin.itemStatus === 'new') {
      return <p className="new-msg">Must save entity at least once before previewing</p>;
    }
    console.log(plugin);

    const path = this.getEntityPath();
    const noSlashInstanceUrl = instanceUrl.replace(/\/$/, '');

    const index = noSlashInstanceUrl.indexOf('//') + 2;
    const stagingPreviewUrl = `${noSlashInstanceUrl.substring(0, index)}staging.${noSlashInstanceUrl.substring(index, noSlashInstanceUrl.length)}`;

    const previewHref = `${noSlashInstanceUrl}${previewPath}?slug=${path}${previewSecret ? `&secret=${previewSecret}` : ''}${selectedLocale && selectedLocale !== 'en' ? `&locale=${selectedLocale}` : ''}`;
    const liveHref = `${noSlashInstanceUrl}${selectedLocale && selectedLocale !== 'en' ? `/${selectedLocale}` : ''}/${path}?preview=exit`;

    const stagingPreviewHref = `${stagingPreviewUrl}${previewPath}?slug=${path}${previewSecret ? `&secret=${previewSecret}` : ''}${selectedLocale && selectedLocale !== 'en' ? `&locale=${selectedLocale}` : ''}`;

    return (
      <>
        {
          locales.length > 1
            ? (
              <select
                style={{
                  width: '100%',
                  marginBottom: 10,
                }}
                onChange={
              (event) => {
                const { value } = event.target;
                this.setState(s => ({ ...s, selectedLocale: value }));
              }
            }
              >
                {
            locales.map(locale => (
              <option key={locale} value={locale} selected={locale === selectedLocale}>
                {locale}
              </option>
            ))
          }
              </select>
            ) : null
        }
        <a className="primary" target="_blank" rel="noopener noreferrer" href={previewHref} style={{ backgroundColor: primaryColor }}>Preview</a>
        <a className="secondary" target="_blank" rel="noopener noreferrer" href={liveHref} style={{ borderColor: primaryColor, color: primaryColor }}>View Live</a>
        <a className="secondary" target="_blank" rel="noopener noreferrer" href={stagingPreviewHref} style={{ borderColor: '#EA3C28', color: '#EA3C28' }}>Staging (preview)</a>
      </>
    );
  }
}
