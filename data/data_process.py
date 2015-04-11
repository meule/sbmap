# -*- coding: utf-8 -*-

# pip install TextBlob
# python data_process.py super_bowl_output.json super_bowl_images.csv outline.json

import os
import sys
import time
import re
import json
from textblob import TextBlob
import string
import unicodecsv as csv
import operator
from collections import OrderedDict
import logging

def processData(source, isource):
	dest = '_data.json'

	#print source, ' > ', dest, ' with ', isource

	rIn = source
	rIn2 = isource
	rOut = open(dest, 'w')

	imagesRow = rIn2.read().split('\n')
	images = {}

	for image in imagesRow:
		images[image.split(',')[0]] = image.split(',')[1]

	data = json.loads ('{ "stories": [\n' + rIn.read().replace('}\n','},\n').replace('\\n',' ') + '{}\n]}')

	for story in data['stories']:
		if '_source' in story.keys() and story['_source']['text']:
			story['sentiments'] = TextBlob(filter(lambda x: x in string.printable, story['_source']['text'])).sentiment.polarity
			iid = story['_id']
			#print iid
			if iid in images.keys():
				story['imageUrl'] = images[iid]
			else:
				story['imageUrl'] = ''
			story['_source']['source'] = story['_source']['source'].replace('instagram','i').replace('twitter','t')

	rOut.write(json.dumps(data))

	rIn.close()
	rIn2.close()
	rOut.close()

	return open(dest, 'r')

def cleanData():
	rIn = open('_data.csv', 'rb')
	rOut = open('data.csv', 'w')

	data1 = rIn.read().split('\n')

	header = data1[0].replace('precise_location,','') + '\n'
	data2 = ''

	for line in data1:
		if line.split(',')[0] == 'True':
			data2 += line[5:] + '\n'

	data3 = data2.replace("[u'","['").replace("', u'","','").replace("']","']").replace('[]','').replace('\r','')

	rOut.write(header + data3)

	rIn.close()
	rOut.close()



logging.basicConfig(level=logging.WARNING)

class Json2Csv(object):
	"""Process a JSON object to a CSV file"""
	collection = None

	def __init__(self, outline):
		self.rows = []

		if not type(outline) is dict:
			raise ValueError('You must pass in an outline for JSON2CSV to follow')
		elif 'map' not in outline or len(outline['map']) < 1:
			raise ValueError('You must specify at least one value for "map"')

		key_map = OrderedDict()
		for header, key in outline['map']:
			splits = key.split('.')
			splits = [int(s) if s.isdigit() else s for s in splits]
			key_map[header] = splits

		self.key_map = key_map
		if 'collection' in outline:
			self.collection = outline['collection']

	def load(self, json_file):
		self.process_each(json.load(json_file))

	def process_each(self, data):
		"""Process each item of a json-loaded dict
		"""
		if self.collection and self.collection in data:
			data = data[self.collection]

		for d in data:
			logging.info(d)
			self.rows.append(self.process_row(d))

	def process_row(self, item):
		"""Process a row of json data against the key map
		"""
		row = {}

		for header, keys in self.key_map.items():
			try:
				row[header] = reduce(operator.getitem, keys, item)
			except (KeyError, TypeError):
				row[header] = None

		return row

	def write_csv(self, filename='output.csv'):
		"""Write the processed rows to the given filename
		"""
		if (len(self.rows) <= 0):
			raise AttributeError('No rows were loaded')
		with open(filename, 'wb+') as f:
			#writer = csv.DictWriter(f, self.key_map.keys(), encoding='utf-8')
			writer = csv.DictWriter(f, self.key_map.keys())
			writer.writeheader()
			writer.writerows(self.rows)

def init_parser():
	import argparse
	parser = argparse.ArgumentParser(description="Data processing for CO NFL project")
	parser.add_argument('json_file', type=argparse.FileType('r'), help="Path to JSON data file to load")
	parser.add_argument('image_file', type=argparse.FileType('r'), help="Path to JSON data file to load")
	parser.add_argument('key_map', type=argparse.FileType('r'), help="File containing JSON key-mapping file to load")

	return parser

if __name__ == '__main__':

	parser = init_parser()
	args = parser.parse_args()

	json_file = processData(args.json_file, args.image_file)

	key_map = json.load(args.key_map)
	loader = Json2Csv(key_map)

	loader.load(json_file)

	loader.write_csv(filename='_data.csv')

	cleanData()


