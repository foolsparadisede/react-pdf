import React, { Fragment } from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';

const MyDoc = () => {
  return (
    <Page size="A4" style={{}}>
      <View
        wrap={true}
        style={{ height: 868, backgroundColor: 'lightgreen' }}
      ></View>

      <View
        fixed={true}
        style={{
          bottom: 0,
          left: 0,
          width: '100%',
          backgroundColor: 'red',
          padding: '20mm',
        }}
      >
        <Text>asdf</Text>
      </View>
    </Page>
  );
};

const BreakPadding = () => {
  return (
    <Document>
      <MyDoc />
    </Document>
  );
};

export default {
  id: 'break-padding',
  name: 'Break Padding',
  description: '',
  Document: BreakPadding,
};
